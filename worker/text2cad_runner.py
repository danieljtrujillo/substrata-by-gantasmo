"""Text2CAD adapter — drives SadilKhan/Text2CAD's CLI inference end-to-end.

Upstream `Cad_VLM/test_user_input.py` is argparse-driven and reads a YAML
config. To run it programmatically:

  1. Render a YAML config pointing at our checkpoint, log dir, and HF cache.
  2. Invoke `python -m Cad_VLM.test_user_input -c <yaml> --prompt <prompt>`
     as a subprocess with PYTHONPATH set to the cloned repo.
  3. The upstream script writes STEP files to `<log_dir>/<index>/pred.step`.
  4. Flatten that into `<job_dir>/part.step`, then tessellate to STL via
     OpenCASCADE's BRepMesh_IncrementalMesh + StlAPI_Writer.
  5. Return CadArtifact[] with absolute URLs back through the worker.

License: Text2CAD is CC BY-NC-SA 4.0; SUBSTRATA's non-commercial posture
means this is fine for personal use. If you ever commercialise, drop the
Text2CAD engine or get a commercial licence first.
"""

from __future__ import annotations
import os
import re
import shutil
import subprocess
import textwrap
import uuid
from pathlib import Path
from typing import List

from schema import CadArtifact


_DEFAULT_BERT = "bert-large-uncased"


def _render_config(checkpoint: str, log_dir: str, cache_dir: str, prompt_file: str,
                   bert_model: str = _DEFAULT_BERT) -> str:
    """Mirror upstream's inference_user_input.yaml shape with our paths."""
    return textwrap.dedent(f"""\
        text_encoder:
          model_name: "{bert_model}"
          max_seq_len: 512
          cache_dir: "{cache_dir}"
          in_dim: 1024
          out_dim: 1024
          num_heads: 8
          dropout: 0.1
        cad_decoder:
          tdim: 1024
          cdim: 256
          num_layers: 8
          num_heads: 8
          dropout: 0.1
          ca_level_start: 2
        test:
          batch_size: 1
          num_workers: 0
          prefetch_factor: 2
          log_dir: "{log_dir}"
          checkpoint_path: "{checkpoint}"
          nucleus_prob: 0
          sampling_type: "max"
          prompt_file: "{prompt_file}"
        debug: false
        info: "substrata-inference"
        """)


def _step_to_stl(step_path: Path, stl_path: Path, deflection: float = 0.5) -> None:
    """Tessellate a STEP file to ASCII STL using pythonocc-core."""
    from OCC.Core.STEPControl import STEPControl_Reader
    from OCC.Core.IFSelect import IFSelect_RetDone
    from OCC.Core.BRepMesh import BRepMesh_IncrementalMesh
    from OCC.Core.StlAPI import StlAPI_Writer

    reader = STEPControl_Reader()
    status = reader.ReadFile(str(step_path))
    if status != IFSelect_RetDone:
        raise RuntimeError(f"STEP read failed for {step_path}")
    reader.TransferRoots()
    shape = reader.OneShape()

    BRepMesh_IncrementalMesh(shape, deflection).Perform()
    writer = StlAPI_Writer()
    writer.SetASCIIMode(False)
    if not writer.Write(shape, str(stl_path)):
        raise RuntimeError(f"STL write failed for {stl_path}")


def run_text2cad(prompt: str, artifacts_root: Path, base_url: str) -> List[CadArtifact]:
    repo = os.environ.get("TEXT2CAD_REPO")
    ckpt = os.environ.get("TEXT2CAD_CKPT")
    if not repo or not Path(repo).exists():
        raise RuntimeError(f"TEXT2CAD_REPO not set or missing: {repo!r}")
    if not ckpt or not Path(ckpt).exists():
        raise RuntimeError(f"TEXT2CAD_CKPT not set or missing: {ckpt!r}")

    job_id = uuid.uuid4().hex[:12]
    job_dir = artifacts_root / job_id
    job_dir.mkdir(parents=True, exist_ok=True)

    log_dir = job_dir / "log"
    log_dir.mkdir()
    cache_dir = os.environ.get("HF_HOME", "/models/.hf_cache")
    Path(cache_dir).mkdir(parents=True, exist_ok=True)

    # Upstream's prompt_file expectation is one prompt per line.
    prompt_file = job_dir / "prompt.txt"
    prompt_file.write_text(prompt + "\n", encoding="utf-8")

    config_path = job_dir / "inference.yaml"
    config_path.write_text(
        _render_config(
            checkpoint=ckpt,
            log_dir=str(log_dir),
            cache_dir=cache_dir,
            prompt_file=str(prompt_file),
        ),
        encoding="utf-8",
    )

    env = dict(os.environ)
    env["PYTHONPATH"] = f"{repo}:{env.get('PYTHONPATH', '')}".strip(":")
    env.setdefault("TRANSFORMERS_OFFLINE", "0")
    env.setdefault("HF_HUB_DISABLE_TELEMETRY", "1")

    cmd = [
        "python", "-m", "Cad_VLM.test_user_input",
        "-c", str(config_path),
        "--prompt", prompt,
    ]
    proc = subprocess.run(
        cmd, cwd=repo, env=env, capture_output=True, text=True, timeout=900,
    )
    if proc.returncode != 0:
        tail = "\n".join((proc.stdout + "\n" + proc.stderr).splitlines()[-40:])
        raise RuntimeError(f"text2cad inference failed (rc={proc.returncode}):\n{tail}")

    # Upstream writes <log_dir>/<index>/pred.step. Find the first STEP file.
    step_candidates = sorted(log_dir.rglob("*.step")) + sorted(log_dir.rglob("*.stp"))
    if not step_candidates:
        raise RuntimeError("Text2CAD finished but produced no STEP output")
    raw_step = step_candidates[0]

    step_path = job_dir / "part.step"
    shutil.copy(raw_step, step_path)

    stl_path = job_dir / "part.stl"
    _step_to_stl(step_path, stl_path)

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
