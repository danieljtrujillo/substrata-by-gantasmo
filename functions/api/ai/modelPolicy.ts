// ─────────────────────────────────────────────────────────────────────────────
// Model policy — single source of truth for which models are allowed to run
// through /api/ai/relay. Enforces:
//
//   1. A minimum Gemini version floor (currently 3.1) — older or "downgraded"
//      model strings are rejected before they reach the provider so a stray
//      hardcoded `gemini-3-flash-preview` somewhere in the codebase cannot
//      silently regress quality.
//   2. An allowlist of approved model IDs.
//   3. Alias normalization (e.g. friendly names → canonical IDs).
//   4. Task-type defaults — when callers send `taskType` instead of (or in
//      addition to) `model`, we pick the policy-compliant model for that task.
//   5. Optional multi-provider routing (Gemini default; OpenRouter/Anthropic
//      gated behind env keys). Provider adapters live in the relay itself —
//      this module only decides which provider + model the request resolves
//      to.
//
// Adding a new approved model is a one-line change here. Frontend code should
// generally pass a `taskType` and let the server resolve the model.
// ─────────────────────────────────────────────────────────────────────────────

export type TaskType =
  | 'advisor_chat'        // fast helper / consultant chat
  | 'deep_reasoning'      // long-form planning, blueprint synthesis
  | 'image_gen'           // image / design synthesis
  | 'image_render'        // high-fidelity renders (Nano Banana Pro tier)
  | 'transcription'       // audio → text
  | 'tts'                 // text → audio
  | 'structured_json'     // schema-constrained reasoning (CAD IR etc.)
  | 'community_search';   // google-search-augmented lookups

export type ProviderId = 'gemini' | 'openrouter' | 'anthropic';

export interface ResolvedModel {
  provider: ProviderId;
  model: string;
  /** Why the policy resolved to this — useful for relay response metadata. */
  reason: string;
}

/**
 * Approved Gemini model IDs. Order matters: we use this for "is this string a
 * known good model?" checks and for prefix-based version inference.
 *
 * Floor policy: any Gemini model NOT in this list is rejected, even if it
 * starts with `gemini-3-`. This deliberately blocks `gemini-3-flash-preview`
 * (legacy 3.0 flash) so a hardcoded fallback in the client can't downgrade
 * the advisor path.
 */
export const APPROVED_GEMINI_MODELS = [
  // Reasoning / pro tier
  'gemini-3.1-pro-preview',
  'gemini-3.5-pro',
  'gemini-3.5-pro-preview',
  // Fast / flash tier
  'gemini-3.5-flash',
  'gemini-3.5-flash-preview',
  'gemini-3.1-flash',
  // Image synthesis (Nano Banana family)
  'gemini-3.1-flash-image-preview',
  'gemini-3-pro-image-preview',
  // TTS
  'gemini-3.1-flash-tts-preview',
] as const;

/**
 * Aliases — friendly / legacy names → canonical model IDs. Anything in the
 * legacy column gets transparently upgraded; anything that looks like a true
 * downgrade attempt (e.g. `gemini-3-flash-preview`) is mapped to the closest
 * approved replacement so the floor is preserved.
 */
const MODEL_ALIASES: Record<string, string> = {
  // Legacy flash → 3.5 flash (no silent downgrade)
  'gemini-3-flash-preview': 'gemini-3.5-flash',
  'gemini-flash':           'gemini-3.5-flash',
  'gemini-pro':             'gemini-3.1-pro-preview',
  'gemini-3-pro':           'gemini-3.1-pro-preview',
  // Common abbreviations
  'flash':                  'gemini-3.5-flash',
  'pro':                    'gemini-3.1-pro-preview',
};

/**
 * Task → default model. The relay uses these whenever the caller sends a
 * `taskType` instead of (or alongside) `model`.
 */
export const TASK_DEFAULTS: Record<TaskType, string> = {
  advisor_chat:     'gemini-3.5-flash',
  deep_reasoning:   'gemini-3.1-pro-preview',
  image_gen:        'gemini-3.1-flash-image-preview',
  image_render:     'gemini-3-pro-image-preview',
  transcription:    'gemini-3.5-flash',
  tts:              'gemini-3.1-flash-tts-preview',
  structured_json:  'gemini-3.1-pro-preview',
  community_search: 'gemini-3.5-flash',
};

/**
 * Inspect a Gemini model id and return the major.minor version it claims.
 * Returns null for ids that don't follow `gemini-<major>.<minor>-...`.
 */
function parseGeminiVersion(id: string): { major: number; minor: number } | null {
  const m = id.match(/^gemini-(\d+)(?:\.(\d+))?/);
  if (!m) return null;
  const major = Number.parseInt(m[1], 10);
  const minor = m[2] ? Number.parseInt(m[2], 10) : 0;
  if (!Number.isFinite(major) || !Number.isFinite(minor)) return null;
  return { major, minor };
}

const FLOOR = { major: 3, minor: 1 };

function meetsGeminiFloor(id: string): boolean {
  const v = parseGeminiVersion(id);
  if (!v) return false;
  if (v.major > FLOOR.major) return true;
  if (v.major < FLOOR.major) return false;
  return v.minor >= FLOOR.minor;
}

export interface PolicyInput {
  /** Explicit model id from the caller — may be a legacy alias. */
  model?: string;
  /** Semantic task hint — preferred path for new code. */
  taskType?: TaskType;
  /** Provider override (optional). Currently only `gemini` is fully wired. */
  provider?: ProviderId;
  /** Provider availability — derived from env at relay invocation time. */
  availableProviders: { gemini: boolean; openrouter: boolean; anthropic: boolean };
}

export type PolicyResult =
  | { ok: true; resolved: ResolvedModel }
  | { ok: false; code: 'unknown_model' | 'below_floor' | 'provider_unavailable' | 'missing_input'; message: string };

/**
 * Resolve a (model, taskType, provider) request into a concrete, policy-
 * compliant (provider, model) pair. Returns a structured error rather than
 * throwing so the relay can emit a clean HTTP response.
 */
export function resolveModel(input: PolicyInput): PolicyResult {
  const { taskType, provider, availableProviders } = input;
  let model = input.model?.trim() ?? '';

  // ── 1. Apply task-type default if no model provided.
  if (!model) {
    if (!taskType) {
      return { ok: false, code: 'missing_input', message: 'either `model` or `taskType` is required' };
    }
    model = TASK_DEFAULTS[taskType];
  }

  // ── 2. Normalize aliases.
  if (MODEL_ALIASES[model]) {
    model = MODEL_ALIASES[model];
  }

  // ── 3. Allowlist check.
  if (!APPROVED_GEMINI_MODELS.includes(model as typeof APPROVED_GEMINI_MODELS[number])) {
    // If the string looks like a Gemini model but isn't approved, give a
    // floor-specific error so the client can show a useful message.
    if (model.startsWith('gemini-')) {
      if (!meetsGeminiFloor(model)) {
        return {
          ok: false,
          code: 'below_floor',
          message: `Model "${model}" is below the Gemini ${FLOOR.major}.${FLOOR.minor}+ policy floor`,
        };
      }
      return {
        ok: false,
        code: 'unknown_model',
        message: `Model "${model}" is not on the approved Gemini allowlist`,
      };
    }
    // Non-Gemini ids: only allow when a provider override + adapter exists.
    if (provider && provider !== 'gemini') {
      if (!availableProviders[provider]) {
        return {
          ok: false,
          code: 'provider_unavailable',
          message: `Provider "${provider}" requested but no key configured server-side`,
        };
      }
      return {
        ok: true,
        resolved: { provider, model, reason: `passthrough to ${provider}` },
      };
    }
    return {
      ok: false,
      code: 'unknown_model',
      message: `Model "${model}" is not approved`,
    };
  }

  // ── 4. Final floor sanity check.
  if (!meetsGeminiFloor(model)) {
    return {
      ok: false,
      code: 'below_floor',
      message: `Model "${model}" is below the Gemini ${FLOOR.major}.${FLOOR.minor}+ policy floor`,
    };
  }

  // ── 5. Provider check — Gemini is always available (key required for
  // relay to function at all; relay will 500 if it's actually missing).
  if (provider && provider !== 'gemini') {
    if (!availableProviders[provider]) {
      return {
        ok: false,
        code: 'provider_unavailable',
        message: `Provider "${provider}" requested but no key configured server-side`,
      };
    }
    return {
      ok: true,
      resolved: { provider, model, reason: `explicit ${provider} routing` },
    };
  }

  return {
    ok: true,
    resolved: {
      provider: 'gemini',
      model,
      reason: input.model ? 'explicit model approved' : `task default for ${taskType}`,
    },
  };
}

/** Exposed for diagnostics / tests. */
export const POLICY_META = {
  floor: FLOOR,
  approvedCount: APPROVED_GEMINI_MODELS.length,
};
