# SUBSTRATA CAD worker

Python service deployed to [Modal](https://modal.com) that handles the heavy
CAD engines (CadQuery + Text2CAD). The Cloudflare Pages app proxies CAD
requests here through `/api/cad/generate`; the worker stays private behind a
shared token.

## What lives in here

| File                | Role |
|---------------------|------|
| `modal_app.py`      | Modal `App` + FastAPI ASGI app. Two POST endpoints (`/generate/cadquery`, `/generate/text2cad`) and a GET endpoint for artifact downloads. |
| `schema.py`         | Pydantic models for the CAD IR, request, and response. Mirrors `src/lib/cadEngines/ir.ts`. |
| `gemini.py`         | Server-side Gemini client. Reads `GEMINI_API_KEY` from the Modal secret and emits IR JSON via the structured-output schema. |
| `dsl.py`            | IR → CadQuery transpiler. One method per feature op. |
| `artifacts.py`      | STEP/STL/GLB export to the Modal Volume + a guarded `serve_path` for downloads. |
| `text2cad_runner.py`| Adapter for [SadilKhan/Text2CAD](https://github.com/SadilKhan/Text2CAD). Imported only inside the GPU function. |
| `requirements.txt`  | Local development pins. Modal builds its own images from `modal_app.py`. |

## One-time setup

```bash
pip install modal
modal token new
```

Create the secret the worker reads:

```bash
modal secret create substrata-cad-worker \
  WORKER_TOKEN=$(openssl rand -hex 24) \
  GEMINI_API_KEY=...
```

Copy the `WORKER_TOKEN` value — you'll paste it into the Cloudflare Pages env
in the next section.

## Deploy

```bash
modal deploy worker/modal_app.py
```

Modal prints the deployed URL, looking like
`https://your-account--substrata-cad-web.modal.run`. Set it as a Pages env
variable so the proxy knows where to forward:

| Pages env var       | Value                                                     |
|---------------------|-----------------------------------------------------------|
| `CAD_WORKER_URL`    | `https://your-account--substrata-cad-web.modal.run`       |
| `CAD_WORKER_SECRET` | the `WORKER_TOKEN` value from the Modal secret             |

On the worker side, you can also set `PUBLIC_BASE_URL` (same as the deploy
URL) so artifact response URLs are absolute. Otherwise the URLs come back as
`/artifacts/<job>/<file>` and the client follows them directly via the
Pages proxy.

## Smoke test

```bash
curl https://your-account--substrata-cad-web.modal.run/health
# → { "ok": true, "artifacts_root": "/artifacts" }

curl -X POST https://your-account--substrata-cad-web.modal.run/generate/cadquery \
  -H "Content-Type: application/json" \
  -H "X-Substrata-Worker-Token: $WORKER_TOKEN" \
  -d '{ "prompt": "a 50x50x10 plate with four M5 holes 10mm from each corner", "engine": "cadquery", "mode": "maker", "units": "mm" }'
```

The first call cold-starts the container (~10s on CPU). Subsequent calls
inside the 120s scaledown window hit the warm container in <2s.

## Text2CAD setup

Text2CAD is **CC BY-NC-SA 4.0** and only enabled for non-commercial use.
Before the first `text2cad` request will succeed:

1. Pre-populate the `substrata-cad-models` volume with the repo + checkpoint:

   ```bash
   modal volume create substrata-cad-models  # if not yet created
   modal volume put substrata-cad-models ./Text2CAD /Text2CAD
   modal volume put substrata-cad-models ./checkpoints /checkpoints
   ```

2. Add the two paths to the worker secret:

   ```bash
   modal secret update substrata-cad-worker \
     TEXT2CAD_REPO=/models/Text2CAD \
     TEXT2CAD_CKPT=/models/checkpoints/Text2CAD
   ```

3. First Text2CAD call cold-starts an A10G GPU (~10-30s including weight
   load). Modal scales the GPU function down after `scaledown_window`.

## Local development

```bash
pip install -r worker/requirements.txt
modal serve worker/modal_app.py
```

`modal serve` runs the same code on Modal but with file-sync hot reload, so
edits to `dsl.py` or `modal_app.py` are picked up in seconds.

## Safety posture

- **Token-gated.** Every endpoint checks `X-Substrata-Worker-Token` against
  the Modal secret. The Cloudflare Pages function is the only sanctioned
  caller; the token is never exposed to the browser.
- **No `exec()` on model output.** Gemini emits a structured IR (validated
  by Pydantic). The transpiler walks the IR and calls CadQuery methods
  directly. The LLM cannot inject Python.
- **Artifact path traversal blocked.** `serve_path` rejects any job_id or
  filename containing characters outside `[A-Za-z0-9_.-]`.
- **Quota enforcement is upstream.** The Cloudflare proxy rate-limits per
  user/IP before requests reach Modal, so this worker doesn't need to know
  who the caller is.
