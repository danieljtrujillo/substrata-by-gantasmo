"""Artifact export + hosting.

CadQuery solids are exported to STEP/STL/GLB into a Modal Volume, and we
return signed URLs back to the client. The volume is mounted into the worker
at /artifacts and served via a dedicated GET endpoint in modal_app.py.
"""

from __future__ import annotations
import hashlib
import os
import tempfile
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Sequence, Tuple

import cadquery as cq
from cadquery import exporters

from schema import CadArtifact


ARTIFACTS_ROOT = Path(os.environ.get("ARTIFACTS_ROOT", "/artifacts"))
ARTIFACTS_ROOT.mkdir(parents=True, exist_ok=True)


@dataclass
class ExportPlan:
    formats: Tuple[str, ...] = ("step", "stl", "glb")


def _sha256_bytes(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 16), b""):
            h.update(chunk)
    return h.hexdigest()


def _export_glb_via_trimesh(stl_path: Path, glb_path: Path) -> None:
    """CadQuery has no native GLB. Convert the STL via trimesh for browser
    preview. Keep this isolated so an environment without trimesh still
    succeeds at STEP/STL."""
    import trimesh
    mesh = trimesh.load_mesh(str(stl_path))
    scene = trimesh.Scene(mesh)
    scene.export(str(glb_path), file_type="glb")


def export_solids(
    solids: Sequence[Tuple[str, cq.Workplane]],
    base_url: str,
    plan: ExportPlan = ExportPlan(),
) -> List[CadArtifact]:
    """Export each (part_id, solid) into the artifacts volume. Returns one
    CadArtifact per emitted file with a URL pointing back at the worker's
    /artifacts/{job}/{file} endpoint."""
    job_id = uuid.uuid4().hex[:12]
    job_dir = ARTIFACTS_ROOT / job_id
    job_dir.mkdir(parents=True, exist_ok=True)

    artifacts: List[CadArtifact] = []
    for part_id, solid in solids:
        safe = "".join(c if c.isalnum() or c in "-_" else "_" for c in part_id) or "part"
        targets: list[tuple[str, Path]] = []
        if "step" in plan.formats:
            step_path = job_dir / f"{safe}.step"
            exporters.export(solid, str(step_path))
            targets.append(("step", step_path))
        stl_path = None
        if "stl" in plan.formats or "glb" in plan.formats:
            stl_path = job_dir / f"{safe}.stl"
            exporters.export(solid, str(stl_path), exportType="STL")
            if "stl" in plan.formats:
                targets.append(("stl", stl_path))
        if "glb" in plan.formats:
            glb_path = job_dir / f"{safe}.glb"
            try:
                _export_glb_via_trimesh(stl_path, glb_path)
                targets.append(("glb", glb_path))
            except Exception as exc:  # noqa: BLE001 — degrade gracefully
                # Drop the GLB silently; STEP+STL still ship.
                pass
        for kind, path in targets:
            artifacts.append(CadArtifact(
                kind=kind,  # type: ignore[arg-type]
                url=f"{base_url.rstrip('/')}/artifacts/{job_id}/{path.name}",
                bytes=path.stat().st_size,
                sha256=_sha256_bytes(path),
            ))
    return artifacts


def serve_path(job_id: str, filename: str) -> Path:
    """Resolve an artifact request to a filesystem path, guarding against
    traversal."""
    safe_job = "".join(c for c in job_id if c.isalnum() or c in "-_")
    safe_file = "".join(c for c in filename if c.isalnum() or c in "-_.")
    if not safe_job or not safe_file or safe_job != job_id or safe_file != filename:
        raise FileNotFoundError("invalid artifact path")
    path = ARTIFACTS_ROOT / safe_job / safe_file
    if not path.exists() or not path.is_file():
        raise FileNotFoundError(f"artifact not found: {safe_job}/{safe_file}")
    return path
