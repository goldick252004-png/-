#!/bin/sh
# One-command rebuild of «ЦСКА · Оттиски».
# Needs: the Lemo-Opuscar library (LIB, with deps, deps voice, deps music and the vcsl/vsco2ce/freepats sample packs),
#        ffmpeg 7+ on PATH, Piper TTS (PIPER, PIPER_MODEL = ru_RU-irina-medium.onnx) for the voice.
set -e
LIB=${LIB:-$HOME/lemo-opuscar}
HERE=$(cd "$(dirname "$0")" && pwd)
export LIB
[ -f "$LIB/core/render/video.mjs" ] || { echo "set LIB to the library folder"; exit 1; }
PY="$LIB/.venv/bin/python"
sh "$HERE/fonts/fetch.sh"
[ -f "$HERE/voices/dur.json" ] || "$PY" "$HERE/tts_ru.py" "$HERE/lines.json" "$HERE/voices"
"$PY" "$LIB/core/tts/asr_check.py" "$HERE/lines.json" "$HERE/voices" --lang ru --model small
cd "$LIB"
node core/render/events.mjs "$HERE"
"$PY" "$HERE/music/score.py"
"$PY" "$HERE/mix.py"
node core/render/video.mjs "$HERE" --fps 24 --workers 4 --out "$HERE/out/video.mp4"
sh core/render/mux.sh "$HERE/out/video.mp4" "$HERE/mix.wav" "$HERE/cska-ottiski.mp4" 24 0
"$PY" "$HERE/subs.py" && "$PY" core/render/srt.py "$HERE/out/subs.json" "$HERE/cska-ottiski.srt"
node core/render/still.mjs "$HERE" 27.0 --q nosub=1 --out "$HERE/out" && cp "$HERE/out/t_27.0.jpg" "$HERE/poster.jpg"
echo "done: $HERE/cska-ottiski.mp4"
