import ast, sys, re, glob
src = open('/app/backend/server.py').read()
tree = ast.parse(src)
a, b = int(sys.argv[1]), int(sys.argv[2])
defs = set()
for n in tree.body:
    if a <= n.lineno <= b:
        if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
            defs.add(n.name)
        elif isinstance(n, (ast.Assign, ast.AnnAssign)):
            for t in (n.targets if isinstance(n, ast.Assign) else [n.target]):
                if isinstance(t, ast.Name):
                    defs.add(t.id)
lines = src.split('\n')
dehors = {}
for i, l in enumerate(lines, 1):
    if a <= i <= b:
        continue
    for d in defs:
        if re.search(r'\b' + re.escape(d) + r'\b', l):
            dehors.setdefault(d, []).append(i)
ext = {}
for f in glob.glob('/app/backend/**/*.py', recursive=True):
    if f.endswith('server.py') or '/tests/' in f:
        continue
    t = open(f).read()
    for d in defs:
        if re.search(r'["\']' + re.escape(d) + r'["\']', t) or re.search(r'server\.' + re.escape(d) + r'\b', t):
            ext.setdefault(d, []).append(f.split('/')[-1])
tests = {}
for f in glob.glob('/app/backend/tests/*.py'):
    t = open(f).read()
    for d in defs:
        if re.search(r'\b' + re.escape(d) + r'\b', t):
            tests.setdefault(d, []).append(f.split('/')[-1])
# names used inside range but defined elsewhere at module level
alln = {n.name for n in tree.body if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef))}
for n in tree.body:
    if isinstance(n, (ast.Assign, ast.AnnAssign)):
        for t in (n.targets if isinstance(n, ast.Assign) else [n.target]):
            if isinstance(t, ast.Name): alln.add(t.id)
used = set()
for n in tree.body:
    if a <= n.lineno <= b:
        for x in ast.walk(n):
            if isinstance(x, ast.Name) and x.id in alln and x.id not in defs:
                used.add(x.id)
print("DEFS", len(defs)); print("UTILISES_DEHORS", {k: v[:6] for k, v in dehors.items()})
print("EXT", ext); print("TESTS", tests); print("DEPENDANCES", sorted(used))
