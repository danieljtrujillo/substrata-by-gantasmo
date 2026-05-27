"""One-shot Modal job to populate the substrata-cad-models Volume.

Clones SadilKhan/Text2CAD into /models/Text2CAD and downloads the inference
checkpoint Text2CAD_1.0.pth from the HuggingFace dataset repo into
/models/checkpoints/Text2CAD. Runs inside Modal so we don't burn local disk
or upload bandwidth.

Run:
    PYTHONIOENCODING=utf-8 python -m modal run worker/setup_text2cad.py::populate

Re-running is safe — the git clone is skipped if the dir exists, and HF
download is idempotent against its own cache.
"""

from __future__ import annotations
import subprocess
from pathlib import Path

import modal

app = modal.App("substrata-cad-setup")

MODELS_VOLUME = modal.Volume.from_name("substrata-cad-models", create_if_missing=True)

setup_image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("git", "git-lfs", "ca-certificates")
    .pip_install("huggingface_hub>=0.23", "hf-transfer>=0.1.6")
    .env({"HF_HUB_ENABLE_HF_TRANSFER": "1"})
)


@app.function(
    image=setup_image,
    volumes={"/models": MODELS_VOLUME},
    secrets=[modal.Secret.from_name("substrata-cad-worker")],
    timeout=3600,
)
def populate() -> dict:
    from huggingface_hub import hf_hub_download

    repo_dir = Path("/models/Text2CAD")
    ckpt_dir = Path("/models/checkpoints/Text2CAD")
    ckpt_dir.mkdir(parents=True, exist_ok=True)

    if repo_dir.exists() and any(repo_dir.iterdir()):
        print(f"[skip] {repo_dir} already populated")
    else:
        print(f"[clone] SadilKhan/Text2CAD -> {repo_dir}")
        subprocess.run(
            ["git", "clone", "--depth=1", "https://github.com/SadilKhan/Text2CAD.git", str(repo_dir)],
            check=True,
        )

    print(f"[hf]    SadilKhan/Text2CAD : text2cad_v1.0/Text2CAD_1.0.pth -> {ckpt_dir}")
    ckpt_path = hf_hub_download(
        repo_id="SadilKhan/Text2CAD",
        filename="text2cad_v1.0/Text2CAD_1.0.pth",
        repo_type="dataset",
        local_dir=str(ckpt_dir),
    )

    MODELS_VOLUME.commit()

    repo_top = sorted([p.name for p in repo_dir.iterdir() if not p.name.startswith(".")])[:15]
    return {
        "repo_dir": str(repo_dir),
        "repo_top_level_entries": repo_top,
        "checkpoint_path": ckpt_path,
        "checkpoint_bytes": Path(ckpt_path).stat().st_size,
    }


@app.local_entrypoint()
def main():
    result = populate.remote()
    for key, value in result.items():
        print(f"{key}: {value}")
