#!/bin/sh
# Fonts (SIL OFL 1.1, via Google Fonts): Nunito 800/900 (Cyrillic), Inter 700. Kept files are reused (FORCE=1 refetches).
set -e
D=$(cd "$(dirname "$0")" && pwd)
UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36'
CH='АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдеёжзийклмнопрстуфхцчшщъыьэюяABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .,:;!?—–-·«»()/'
ENC=$(python3 -c "import urllib.parse,sys;print(urllib.parse.quote(sys.argv[1]))" "$CH")
get() { [ -s "$D/$1" ] && [ -z "$FORCE" ] && return 0
  url=$(curl -fsSL -A "$UA" "$2" | grep -o 'url([^)]*)' | head -1 | sed 's/url(//;s/)//'); [ -n "$url" ] || { echo "no url for $1" >&2; exit 1; }
  curl -fsSL -o "$D/$1" "$url"; echo "fonts/$1"; }
for w in 800 900; do get "nunito-$w.woff2" "https://fonts.googleapis.com/css2?family=Nunito:wght@$w&text=$ENC"; done
get inter-700.woff2 "https://fonts.googleapis.com/css2?family=Inter:wght@700&text=$ENC"
