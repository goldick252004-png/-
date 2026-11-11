"""Russian voice-over with Piper (offline): lines.json → voices/<id>.wav (24 kHz mono, trimmed) + voices/dur.json.
  PIPER = piper executable, PIPER_MODEL = voice .onnx (default ru_RU-irina-medium). Per line: "say" (spoken text), "speed" (length scale).
  python tts_ru.py lines.json voices [L2,L7]   (optional: only these ids)"""
import sys, os, json, subprocess, tempfile
import numpy as np, soundfile as sf
lines, out = sys.argv[1], sys.argv[2]
PIPER = os.environ.get('PIPER', 'piper'); MODEL = os.environ['PIPER_MODEL']
os.makedirs(out, exist_ok=True)
ONLY = set(sys.argv[3].split(',')) if len(sys.argv) > 3 else None
dp = os.path.join(out, 'dur.json'); durs = json.load(open(dp)) if os.path.exists(dp) else {}
for L in json.load(open(lines)):
    if ONLY and L['id'] not in ONLY: continue
    text = L.get('say') or L['text']
    with tempfile.TemporaryDirectory() as td:
        raw = os.path.join(td, 'a.wav')
        subprocess.run([PIPER, '-m', MODEL, '-f', raw, '--length-scale', str(L.get('speed', 1.14)), '--noise-scale', '0.5', '--noise-w-scale', '0.6'], input=text.encode(), check=True, capture_output=True)
        res = os.path.join(td, 'b.wav')
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', raw, '-ar', '24000', '-ac', '1', res], check=True)
        a, sr = sf.read(res, dtype='float32')
    env = np.abs(a) > 0.01; idx = np.where(env)[0]
    a = a[max(0, idx[0] - 600): idx[-1] + 2400]
    a = a / (np.abs(a).max() + 1e-9) * 0.9
    sf.write(os.path.join(out, L['id'] + '.wav'), a, sr); durs[L['id']] = round(len(a) / sr, 3)
    print(L['id'], durs[L['id']], 's')
json.dump(durs, open(os.path.join(out, 'dur.json'), 'w'), indent=1)
