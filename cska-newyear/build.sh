#!/bin/sh
# One-command rebuild of «ЦСКА · С Новым годом!» (Paper Pop-up Book).
# Needs the Lemo-Opuscar library (LIB, deps + deps music, HDRI pack, vcsl/vsco2ce sample packs) and ffmpeg 7+ on PATH.
# On a machine without a GPU: LEMO_ANGLE=swiftshader (about 5 s a frame).
set -e
LIB=${LIB:-$HOME/lemo-opuscar}; HERE=$(cd "$(dirname "$0")" && pwd); export LIB
PY="$LIB/.venv/bin/python"
sh "$HERE/fonts/fetch.sh"
cd "$LIB"
node core/render/events.mjs "$HERE"
"$PY" "$HERE/music/score.py"
"$PY" "$HERE/mix.py"
node core/render/video.mjs "$HERE" --fps 24 --workers 2 --out "$HERE/out/video.mp4"
sh core/render/mux.sh "$HERE/out/video.mp4" "$HERE/mix.wav" "$HERE/cska-novyi-god.mp4" 24 0
node core/render/still.mjs "$HERE" 32.6 --out "$HERE/out" && cp "$HERE/out/t_32.6.jpg" "$HERE/poster.jpg"
echo "done: $HERE/cska-novyi-god.mp4"
