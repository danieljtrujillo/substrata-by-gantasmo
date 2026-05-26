"""Text2CAD adapter — runs SadilKhan/Text2CAD inference inside the worker.

This module is *only* imported inside the GPU Modal function so the CPU image
does not need PyTorch.

License posture: Text2CAD is CC BY-NC-SA 4.0. SUBSTRATA is a non-commercial
personal project, so it is allowed to use the code and weights, but if the
project later goes commercial this adapter MUST be disabled or replaced with
a licensed engine. The Modal endpoint already labels artifacts produced here
with `licenseHint = 'cc-by-nc-sa-4.0'` so downstream consumers know.

Setup (done once, then cached in the /models Modal Volume):
  1. Clone https://github.com/SadilKhan/Text2CAD into /models/Text2CAD.
  2. Download the HuggingFace checkpoint to /models/checkpoints/Text2CAD.
  3. Set TEXT2CAD_REPO=/models/Text2CAD and TEXT2CAD_CKPT=/models/checkpoints/Text2CAD.
"""

from __future__ import annotations
import os
import sys
import uuid
from pathlib import Path
from typing import List, Tuple

from schema import CadArtifact


def _import_text2cad():
    """Lazy import — the Text2CAD repo must be on sys.path."""
    repo = os.environ.get("TEXT2CAD_REPO")
    if not repo:
        raise RuntimeError("TEXT2CAD_REPO env var not set; cannot import inference code")
    if repo not in sys.path:
        sys.path.insert(0, repo)
    from Cad_VLM import test_user_input as t2c_inference  # type: ignore
    from CadSeqProc.cad_sequence import CADSequence  # type: ignore
    return t2c_inference, CADSequence


def run_text2cad(prompt: str, artifacts_root: Path, base_url: str) -> List[CadArtifact]:
    inference, CADSequence = _import_text2cad()
    ckpt = os.environ.get("TEXT2CAD_CKPT")
    if not ckpt:
        raise RuntimeError("TEXT2CAD_CKPT env var not set; cannot locate checkpoint")

    job_id = uuid.uuid4().hex[:12]
    job_dir = artifacts_root / job_id
    job_dir.mkdir(parents=True, exist_ok=True)

    sequence_vec = inference.run(prompt=prompt, checkpoint=ckpt)
    cad_seq = CADSequence.from_vec(sequence_vec)

    step_path = job_dir / "part.step"
    stl_path = job_dir / "part.stl"
    cad_seq.save_stp(str(step_path))
    cad_seq.create_mesh(str(stl_path))

    return [
        CadArtifact(
            kind="step",  # type: ignore[arg-type]
            url=f"{base_url.rstrip('/')}/artifacts/{job_id}/{step_path.name}",
            bytes=step_path.stat().st_size,
        ),
        CadArtifact(
            kind="stl",  # type: ignore[arg-type]
            url=f"{base_url.rstrip('/')}/artifacts/{job_id}/{stl_path.name}",
            bytes=stl_path.stat().st_size,
        ),
    ]
