#!/bin/sh
# Final encodes: H.264 yuv420p BT.709 (what Reels / VK Клипы / Shorts / YouTube expect), 30 fps.
#   *-sfx.mp4    — with the synthesised sound effects, normalised to −18 LUFS (room left for music)
#   *-silent.mp4 — picture only, no audio track
set -e
HERE=$(cd "$(dirname "$0")" && pwd); cd "$HERE"
FF=${FFMPEG:-ffmpeg}
LN=$($FF -hide_banner -i sfx.wav -af loudnorm=I=-18:TP=-1.5:LRA=11:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
mi=$(echo "$LN" | sed -n 's/.*"input_i" : "\(.*\)".*/\1/p'); mtp=$(echo "$LN" | sed -n 's/.*"input_tp" : "\(.*\)".*/\1/p')
mlra=$(echo "$LN" | sed -n 's/.*"input_lra" : "\(.*\)".*/\1/p'); mth=$(echo "$LN" | sed -n 's/.*"input_thresh" : "\(.*\)".*/\1/p'); off=$(echo "$LN" | sed -n 's/.*"target_offset" : "\(.*\)".*/\1/p')
AF="loudnorm=I=-18:TP=-1.5:LRA=11:measured_I=$mi:measured_TP=$mtp:measured_LRA=$mlra:measured_thresh=$mth:offset=$off:linear=true"
VF="scale=in_range=full:out_range=tv,format=yuv420p"
VX="-c:v libx264 -preset slow -crf 17 -profile:v high -pix_fmt yuv420p -colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv -r 30 -movflags +faststart"
for k in ${ONLY:-h v}; do
  [ $k = h ] && name=nika-pismo-1920x1080 || name=nika-pismo-1080x1920
  $FF -y -hide_banner -loglevel error -i out/video-$k.mp4 -vf "$VF" $VX -an "$name-silent.mp4"
  $FF -y -hide_banner -loglevel error -i "$name-silent.mp4" -i sfx.wav -map 0:v -map 1:a -c:v copy -af "$AF" -ar 48000 -c:a aac -b:a 192k -shortest -movflags +faststart "$name-sfx.mp4"
  echo "$name-silent.mp4  $name-sfx.mp4"
done
