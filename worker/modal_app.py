"""SUBSTRATA CAD worker — deployed to Modal.

Two engines, both behind one ASGI app:
  - POST /generate/cadquery — CPU function. Gemini emits SUBSTRATA CAD IR,
    transpiles to CadQuery, exports STEP/STL/GLB into the Modal Volume.
  - POST /generate/text2cad  — GPU function (called via .remote()). Inference
    on the SadilKhan/Text2CAD checkpoint cached in a separate Volume.

Auth: every request must carry X-Substrata-Worker-Token matching the
WORKER_TOKEN secret. The Cloudflare Pages proxy at /api/cad/generate adds it.

Deploy:
  modal deploy worker/modal_app.py
"""

from __future__ import annotations
import os
import sys
import time
import logging
from pathlib import Path
from typing import Optional

import modal

# Resolve the worker source dir relative to THIS file. Modal's `add_local_dir`
# treats relative paths as relative to the CWD at deploy time, so running
# `modal deploy worker/modal_app.py` from the repo root would otherwise copy
# the entire repo (node_modules and all) into the image.
_WORKER_DIR = str(Path(__file__).parent.resolve())

# Make sibling modules importable both when Modal evaluates this file locally
# (during `modal deploy`) and inside the deployed container (where the same
# files live at /app via add_local_dir).
if _WORKER_DIR not in sys.path:
    sys.path.insert(0, _WORKER_DIR)

# Hoist schema imports to module scope. FastAPI's OpenAPI introspection
# can't resolve forward references when Pydantic models are imported inside
# the deferred asgi_app function — surfaced as a 500 on /openapi.json and
# 422 on POSTs because FastAPI fell back to treating the body model as a
# query parameter.
from schema import (  # noqa: E402
    GenerateRequest, GenerateResponse, ValidationFinding, CadArtifact,
)

# ── Modal app + images ────────────────────────────────────────────────────
app = modal.App("substrata-cad")

ARTIFACTS_VOLUME = modal.Volume.from_name("substrata-cad-artifacts", create_if_missing=True)
MODELS_VOLUME = modal.Volume.from_name("substrata-cad-models", create_if_missing=True)

cadquery_image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("libgl1", "libglu1-mesa", "libxext6", "libxrender1")
    .pip_install(
        "fastapi[standard]>=0.115",
        "cadquery>=2.4",
        "trimesh>=4.0",
        "pydantic>=2.6",
        "google-genai>=1.0",
    )
    .add_local_dir(_WORKER_DIR, "/app", copy=True)
    .workdir("/app")
)

# pythonocc-core is conda-forge only (no PyPI wheel), so the Text2CAD image
# uses Modal's micromamba builder for the OCC binding and pip for the rest.
text2cad_image = (
    modal.Image.micromamba(python_version="3.10")
    .apt_install("git", "libgl1", "libglu1-mesa", "libxext6", "libxrender1", "libgomp1")
    .micromamba_install("pythonocc-core=7.7.2", channels=["conda-forge"])
    .pip_install(
        "torch==2.2.1",
        "transformers>=4.41",
        "trimesh>=4.0",
        "open3d>=0.18",
        "pyvista>=0.43",
        "pydantic>=2.6",
        "huggingface_hub>=0.23",
    )
    .add_local_dir(_WORKER_DIR, "/app", copy=True)
    .workdir("/app")
)

WORKER_SECRET = modal.Secret.from_name(
    "substrata-cad-worker",
    required_keys=["WORKER_TOKEN", "GEMINI_API_KEY"],
)


# ── Helpers ───────────────────────────────────────────────────────────────
def _verify_token(token: Optional[str]) -> None:
    expected = os.environ.get("WORKER_TOKEN")
    if not expected or not token or token != expected:
        from fastapi import HTTPException
        raise HTTPException(status_code=401, detail="invalid worker token")


def _public_base_url() -> str:
    """The base URL clients should use for artifact downloads. Set
    PUBLIC_BASE_URL on the worker secret to the deployed Modal endpoint host
    (e.g. https://<account>--substrata-cad-web.modal.run); falls back to a
    relative path if unset (the Pages proxy will route /artifacts back here)."""
    return os.environ.get("PUBLIC_BASE_URL", "")


# ── Text2CAD GPU function ─────────────────────────────────────────────────
@app.function(
    image=text2cad_image,
    gpu="A10G",
    volumes={"/artifacts": ARTIFACTS_VOLUME, "/models": MODELS_VOLUME},
    secrets=[WORKER_SECRET],
    timeout=600,
    scaledown_window=300,
)
def text2cad_infer(prompt: str, base_url: str) -> list[dict]:
    from text2cad_runner import run_text2cad
    artifacts = run_text2cad(prompt, Path("/artifacts"), base_url)
    ARTIFACTS_VOLUME.commit()
    return [a.model_dump() for a in artifacts]


# ── Web app (CPU, hosts both endpoints + artifact serving) ────────────────
@app.function(
    image=cadquery_image,
    volumes={"/artifacts": ARTIFACTS_VOLUME},
    secrets=[WORKER_SECRET],
    timeout=300,
    scaledown_window=120,
    min_containers=0,
)
@modal.asgi_app()
def web():
    from fastapi import FastAPI, Header, HTTPException, Body
    from fastapi.responses import FileResponse, JSONResponse

    from gemini import prompt_to_ir
    from dsl import transpile_ir, TranspileError
    from artifacts import export_solids, serve_path, ARTIFACTS_ROOT

    api = FastAPI(title="substrata-cad-worker")
    log = logging.getLogger("substrata-cad")

    @api.get("/health")
    async def health():
        return {"ok": True, "artifacts_root": str(ARTIFACTS_ROOT)}

    @api.post("/generate/cadquery", response_model=GenerateResponse)
    async def generate_cadquery(
        req: GenerateRequest = Body(...),
        x_substrata_worker_token: str | None = Header(default=None, alias="X-Substrata-Worker-Token"),
    ):
        _verify_token(x_substrata_worker_token)
        if req.engine != "cadquery":
            raise HTTPException(400, detail=f"this endpoint only accepts engine=cadquery, got {req.engine}")
        t0 = time.monotonic()
        logs: list[str] = []
        validation: list[ValidationFinding] = []

        try:
            ir = prompt_to_ir(req.prompt, mode=req.mode, units=req.units, design_style=req.designStyle)
            logs.append(f"IR generated with {len(ir.parts)} parts, {sum(len(p.features) for p in ir.parts)} features")
        except Exception as exc:
            log.exception("IR generation failed")
            return GenerateResponse(
                engine="cadquery", ok=False,
                validation=[ValidationFinding(severity="error", code="ir_generation_failed", message=str(exc))],
                logs=logs, generationMs=(time.monotonic() - t0) * 1000,
            )

        try:
            solids = transpile_ir(ir)
        except TranspileError as exc:
            log.exception("Transpile failed")
            return GenerateResponse(
                engine="cadquery", ok=False, ir=ir.model_dump(),
                validation=[ValidationFinding(severity="error", code="transpile_failed", message=str(exc))],
                logs=logs, generationMs=(time.monotonic() - t0) * 1000,
            )

        try:
            base_url = _public_base_url() or ""
            artifacts = export_solids(solids, base_url=base_url)
            ARTIFACTS_VOLUME.commit()
            logs.append(f"exported {len(artifacts)} artifacts")
        except Exception as exc:
            log.exception("Export failed")
            return GenerateResponse(
                engine="cadquery", ok=False, ir=ir.model_dump(),
                validation=[ValidationFinding(severity="error", code="export_failed", message=str(exc))],
                logs=logs, generationMs=(time.monotonic() - t0) * 1000,
            )

        return GenerateResponse(
            engine="cadquery", ok=True, ir=ir.model_dump(),
            artifacts=artifacts, validation=validation, logs=logs,
            generationMs=(time.monotonic() - t0) * 1000,
        )

    @api.post("/generate/text2cad", response_model=GenerateResponse)
    async def generate_text2cad(
        req: GenerateRequest = Body(...),
        x_substrata_worker_token: str | None = Header(default=None, alias="X-Substrata-Worker-Token"),
    ):
        _verify_token(x_substrata_worker_token)
        if req.engine != "text2cad":
            raise HTTPException(400, detail=f"this endpoint only accepts engine=text2cad, got {req.engine}")
        t0 = time.monotonic()
        logs: list[str] = []
        try:
            base_url = _public_base_url() or ""
            artifact_dicts = text2cad_infer.remote(req.prompt, base_url)
            logs.append(f"text2cad emitted {len(artifact_dicts)} artifacts")
            ARTIFACTS_VOLUME.reload()
            artifacts = [CadArtifact(**a) for a in artifact_dicts]
            return GenerateResponse(
                engine="text2cad", ok=True,
                artifacts=artifacts, logs=logs,
                generationMs=(time.monotonic() - t0) * 1000,
            )
        except Exception as exc:
            log.exception("Text2CAD failed")
            return GenerateResponse(
                engine="text2cad", ok=False,
                validation=[ValidationFinding(severity="error", code="text2cad_failed", message=str(exc))],
                logs=logs, generationMs=(time.monotonic() - t0) * 1000,
            )

    @api.get("/artifacts/{job_id}/{filename}")
    async def fetch_artifact(job_id: str, filename: str):
        try:
            path = serve_path(job_id, filename)
        except FileNotFoundError as exc:
            raise HTTPException(404, detail=str(exc))
        media = {
            ".step": "application/step",
            ".stp":  "application/step",
            ".stl":  "model/stl",
            ".glb":  "model/gltf-binary",
            ".obj":  "model/obj",
        }.get(path.suffix.lower(), "application/octet-stream")
        return FileResponse(str(path), media_type=media, filename=path.name)

    return api
