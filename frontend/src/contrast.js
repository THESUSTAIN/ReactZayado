const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  const base = 'http://127.0.0.1:8099';
  await p.goto(base + '/login', { waitUntil: 'networkidle' });
  await p.evaluate(async () => {
    const a = await (await fetch('/api/auth/request-link', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'pro@zayado.net'})})).json();
    const r = await (await fetch('/api/auth/verify-link', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:a.dev_link.split('token=')[1]})})).json();
    localStorage.setItem('cours_auth_token', r.access_token);
  });
  for (const path of ['/pilotage', '/']) {
    await p.goto(base + path, { waitUntil: 'networkidle' });
    await p.waitForTimeout(1300);
    const out = await p.evaluate(() => {
      const seen = {};
      [...document.querySelectorAll('p, span, small, div')].forEach(el => {
        if (el.children.length) return;
        const c = getComputedStyle(el).color.match(/[\d.]+/g);
        const t = (el.innerText || '').trim();
        if (!c || c.length !== 4 || t.length < 3) return;
        const a = parseFloat(c[3]);
        if (a >= 0.45) return;
        const key = `alpha ${a} — ${getComputedStyle(el).fontSize}`;
        (seen[key] = seen[key] || []).push(t.slice(0, 40));
      });
      return Object.entries(seen).map(([k, v]) => `${k}  ×${v.length}  ex: "${v[0]}"`);
    });
    console.log(`\n${path}`); out.forEach(l => console.log('   ', l));
  }
  await b.close();
})();
