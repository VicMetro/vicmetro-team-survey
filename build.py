"""Vic Metro team feedback survey: build dist/index.html from src/questions.json (+ shared look from the careers project).
Usage: python3 build.py   then commit + push dist/ contents (see README.md)."""
import json, os, shutil, html, urllib.parse
TH = json.load(open('shared/theme.json'))
CSS = open('shared/app.css').read() + "\n" + open('src/survey.css').read()
LOGO = open('shared/logo-vm.svg.frag').read().replace('`', '').strip()
VMARK, KEY = open('shared/vmark.svg').read(), open('shared/anon_key.txt').read().strip()
TPL, JS = open('src/template.html').read(), open('src/survey.js').read()
Q = json.load(open('src/questions.json'))
n, ids = 0, set()
for s in Q['sections']:
    for q in s['questions']:
        n += 1; q['n'] = n
        assert q['id'] not in ids, f"duplicate id {q['id']}"; ids.add(q['id'])
        assert q['type'] in ('scale', 'text') and (q['type'] == 'text') == ('options' not in q), q['id']
cfg = {k: Q[k] for k in ('survey_version', 'title', 'intro', 'name', 'sections')}
V = '<path d="M12 14h12.5L32 37.5 39.5 14H52L38.5 51h-13z" fill="%s"/>'
fav = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="%s"/>%s</svg>' % (TH['bg'], V % TH['accent'])
root = ":root{--a:%s;--a2:%s;--a3:%s;--on-a:%s;--c0:%s;--c:%s;--stripe:%s;--warn:%s;--ay:%s}" % (TH['accent'], TH['accentHover'], TH['accentPressed'], TH['onAccent'], TH['bg'], TH['surface'], TH['stripeDark'], TH['warn'], TH['accent2'])
js = JS.replace('%%CFG%%', json.dumps(cfg, ensure_ascii=False)).replace('%%SUPA_KEY%%', KEY).replace('%%VMARK%%', VMARK).replace('%%LOGO%%', LOGO)
assert '%%' not in js
out = (TPL.replace('%%CSS%%', root + "\n" + CSS).replace('%%JS%%', js).replace('%%TITLE%%', 'Team Feedback Survey · Vic Metro')
       .replace('%%DESC%%', 'Vic Metro team feedback survey. About 10 minutes, confidential.').replace('%%FAV%%', 'data:image/svg+xml,' + urllib.parse.quote(fav)))
if os.path.isdir('dist'): shutil.rmtree('dist')
os.makedirs('dist'); open('dist/index.html', 'w').write(out); open('dist/.nojekyll', 'w').write('')
shutil.copy('shared/touch.png', 'dist/touch.png')
print('built dist/index.html', len(out), 'bytes,', n, 'questions')
