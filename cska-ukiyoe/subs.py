"""Subtitle cues (same rule as SUBS in main.js) → out/subs.json; then core/render/srt.py writes the .srt"""
import json, os, re
H = os.path.dirname(os.path.abspath(__file__))
L = {l['id']: l for l in json.load(open(f'{H}/lines.json'))}; D = json.load(open(f'{H}/voices/dur.json'))
VO = dict(re.findall(r'(L\d): ([\d.]+)', re.search(r'export const VO = \{([^}]*)\}', open(f'{H}/story.js').read()).group(1)))
cues = [{'t0': float(t), 't1': float(t) + max(1.8, D[i] + .7), 'text': L[i].get('sub', L[i]['text'])} for i, t in VO.items()]
for a, b in zip(cues, cues[1:]): a['t1'] = min(a['t1'], b['t0'] - .1)
os.makedirs(f'{H}/out', exist_ok=True); json.dump(cues, open(f'{H}/out/subs.json', 'w'), ensure_ascii=False, indent=1)
