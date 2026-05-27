"""Server-side Gemini client for the CAD worker.

The worker reads its own GEMINI_API_KEY from Modal secrets — separate from
the Cloudflare Pages binding — so the Pages function does NOT forward keys.
Both keys can be the same value; they are kept distinct so the worker can be
deployed/rotated independently.
"""

from __future__ import annotations
import json
import os
from typing import Any

from google import genai
from google.genai import types

from schema import CadIR

_MODEL = os.environ.get("CAD_GEMINI_MODEL", "gemini-3.1-pro-preview")


def _client() -> genai.Client:
    key = os.environ.get("GEMINI_API_KEY")
    if not key:
        raise RuntimeError("GEMINI_API_KEY not set in worker environment")
    return genai.Client(api_key=key)


# Gemini's structured-output mode accepts a constrained JSON Schema subset
# (no prefixItems, no anyOf, no exclusiveMinimum, no $ref). Our Pydantic IR
# uses tuples, discriminated unions, and refined numbers — all of which
# generate the forbidden constructs. Rather than maintain a parallel
# Gemini-flavoured schema, we pin response_mime_type to JSON and document
# the IR shape inline in the system prompt, then validate with Pydantic on
# the way back. That gives us strict validation without fighting the API.
_IR_DOC = r"""
SUBSTRATA CAD IR JSON shape:

{
  "units": "mm" | "inch",
  "parts": [
    {
      "id": string,
      "name": string,
      "material": string (optional),
      "color": string (optional),
      "features": [ ...feature_objects... ]
    }
  ],
  "assemblyNotes": string (optional)
}

Each feature is one of these shapes (the `op` field discriminates):

  { "op":"sketch", "id":string, "plane":"XY"|"XZ"|"YZ", "offset":number,
    "primitives":[ ...sketch_primitive... ] }

    sketch_primitive variants:
      { "kind":"rect",    "origin":[x,y], "width":n, "height":n }
      { "kind":"circle",  "center":[x,y], "radius":n }
      { "kind":"ellipse", "center":[x,y], "rx":n, "ry":n, "rotationDeg":n }
      { "kind":"polygon", "points":[[x,y], [x,y], ...] }      // 3+ points
      { "kind":"slot",    "p1":[x,y], "p2":[x,y], "width":n }
      { "kind":"arc",     "center":[x,y], "radius":n, "startDeg":n, "endDeg":n }
      { "kind":"bezier",  "controls":[
          { "anchor":[x,y], "h1":[x,y], "h2":[x,y] },   // 2+ control points
          ...
        ] }                  // closed cubic bezier loop, anchors on the curve, h1/h2 are handles

  { "op":"extrude",   "id":string, "sketchId":string, "distance":n,
    "taperDeg":n,                 // optional, default 0
    "bothSides":bool }            // optional, default false

  { "op":"revolve",   "id":string, "sketchId":string,
    "axis":"X"|"Y"|"Z", "angleDeg":n }

  { "op":"fillet",    "id":string, "target":string, "radius":n,
    "edgeFilter":"all"|"vertical"|"horizontal"|"top"|"bottom" }

  { "op":"chamfer",   "id":string, "target":string, "size":n,
    "edgeFilter":"all"|"vertical"|"horizontal"|"top"|"bottom" }

  { "op":"shell",     "id":string, "target":string, "thickness":n,
    "openFaces":["top"|"bottom"|"left"|"right"|"front"|"back", ...] }

  { "op":"boolean",   "id":string, "mode":"union"|"difference"|"intersection",
    "targets":[string, string, ...] }                 // 2+ ids, evaluated left-to-right

  { "op":"pattern",   "id":string, "target":string,
    "kind":"linear"|"polar"|"grid",
    "count":int>0, "spacing":[dx,dy,dz], "axis":"X"|"Y"|"Z" }

  { "op":"holePattern", "id":string, "target":string,
    "diameter":n, "depth":n (optional),
    "points":[[x,y], ...],
    "plane":"XY"|"XZ"|"YZ",
    "countersink": { "diameter":n, "depth":n } (optional) }

  { "op":"transform", "id":string, "target":string,
    "translate":[x,y,z], "rotateDeg":[rx,ry,rz], "scale":[sx,sy,sz] }

  { "op":"mirror",    "id":string, "target":string,
    "plane":"XY"|"XZ"|"YZ", "keepOriginal":bool }
    // reflects target across plane. keepOriginal=true unions both copies.

  { "op":"loft",      "id":string,
    "sketchIds":[string, string, ...],          // 2+ sketches, stacked along common axis
    "ruled":bool, "closed":bool }
    // smoothly interpolates a solid through stacked sketches.
    // USE FOR: ergonomic grips, organic transitions, aerodynamic shapes,
    // tapered handles, custom heat-sink profiles.

  { "op":"sweep",     "id":string,
    "profileSketchId":string,                   // 2D cross-section
    "pathSketchId":string,                      // 2D path the profile follows
    "twistDegPerUnit":n, "multisection":bool }
    // extrudes a profile along a path. USE FOR: tubing, cables, handrails,
    // twisted columns, organic vines, snake-form ducting.
"""


_SYSTEM_PROMPT = f"""\
You are a mechanical-CAD architect. Convert the user's prompt into a SUBSTRATA
CAD IR — a strict JSON document describing a parametric solid model as a
sequence of features.
{_IR_DOC}

Rules:
- Units default to millimetres. Every dimension is a plain number, no units.
- Each feature has a unique `id` (kebab- or snake-case).
- Sketches are referenced by `sketchId` from extrude / revolve.
- Subsequent ops reference earlier solids by feature `id` via `target`.
- For drilled holes, prefer `holePattern` over boolean+sketches.
- A part MUST end with a solid-producing op (extrude / boolean / fillet / hole etc.).
- Return ONLY the JSON document. No prose, no markdown fences, no comments.
"""


def prompt_to_ir(prompt: str, mode: str = "maker", units: str = "mm",
                 design_style: str | None = None) -> CadIR:
    client = _client()
    context_block = "\n".join([
        f"Mode: {mode}",
        f"Units: {units}",
        f"Design style: {design_style or 'neutral'}",
    ])

    response = client.models.generate_content(
        model=_MODEL,
        contents=[
            {"role": "user", "parts": [{"text": f"{context_block}\n\nPrompt: {prompt}"}]},
        ],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            system_instruction=_SYSTEM_PROMPT,
        ),
    )
    raw = response.text or ""
    if not raw.strip():
        raise RuntimeError("Gemini returned empty IR")
    # Strip any ```json fences the model adds despite the rule above.
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        first_nl = cleaned.find("\n")
        if first_nl != -1:
            cleaned = cleaned[first_nl + 1:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        cleaned = cleaned.strip()
    try:
        data: Any = json.loads(cleaned)
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"Gemini IR is not valid JSON: {exc}; head={cleaned[:200]}") from exc
    return CadIR.model_validate(data)
