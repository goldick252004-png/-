#!/bin/sh
# One-command rebuild of «Ника и новогодний мяч» (both formats, with and without sound effects).
# Needs the Lemo-Opuscar library (LIB, its .venv with numpy/scipy/soundfile) and ffmpeg 6+ on PATH.
set -e
LIB=${LIB:-$HOME/lemo-opuscar}; HERE=$(cd "$(dirname "$0")" && pwd); export LIB
sh "$HERE/fonts/fetch.sh"
(cd "$HERE" && node events.mjs > events.json && "$LIB/.venv/bin/python" sfx.py)
cd "$LIB"
node core/render/video.mjs "$HERE" --fps 30 --workers 3 --out "$HERE/out/video-h.mp4"
node core/render/video.mjs "$HERE" --fps 30 --workers 3 --size 1080x1920 --out "$HERE/out/video-v.mp4"
sh "$HERE/mux.sh"
