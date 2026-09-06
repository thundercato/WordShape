import pathlib,html,json
p=pathlib.Path(__file__).parent
s=(p/'ui.html').read_text().replace('__DATA__',(p/'dictionary.json').read_text()).replace('__ENGINE__',(p/'engine.js').read_text())
# Licence is inserted into a JS string containing HTML, so escape both syntaxes.
s=s.replace('__LICENCE__',json.dumps(html.escape((p/'DICTIONARY-LICENCE.txt').read_text()))[1:-1].replace("'","\\'"))
(p/'dist').mkdir(exist_ok=True)
(p/'dist'/'wordshape.html').write_text(s)
(p/'dist'/'index.html').write_text(s)
print('HTML bytes',len(s.encode()))
