#!/bin/sh
# Rebuild «Письмо Деду Морозу» (both formats). Needs the Lemo-Opuscar library (LIB) with its .venv and ffmpeg 6+.
# Without a GPU (software WebGL) one format takes about an hour.
set -e
LIB=${LIB:-$HOME/lemo-opuscar}; HERE=$(cd "$(dirname "$0")" && pwd); export LIB
(cd "$HERE" && "$LIB/.venv/bin/python" sfx.py)
cd "$LIB"
node core/render/video.mjs "$HERE" --fps 30 --workers 3 --out "$HERE/out/video-h.mp4"
node core/render/video.mjs "$HERE" --fps 30 --workers 3 --size 1080x1920 --out "$HERE/out/video-v.mp4"
sh "$HERE/mux.sh"
