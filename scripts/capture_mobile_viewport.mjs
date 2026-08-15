import fs from 'node:fs/promises';

const url = process.argv[2] || 'https://3001-irmp9h23rxxehdh4qvdc7-a187ca6b.us5.manus.computer/';
const output = process.argv[3] || '/home/ubuntu/cours_source/Cours-main/audit_mobile_decision_390x844.png';
const targets = await fetch('http://127.0.0.1:9222/json').then((response) => response.json());
const target = targets.find((item) => item.type === 'page' && item.url.includes('3001-irmp9h23rxxehdh4qvdc7-a187ca6b.us5.manus.computer')) || targets.find((item) => item.type === 'page');
if (!target?.webSocketDebuggerUrl) throw new Error('Aucune page Chromium exploitable n’a été trouvée.');

const socket = new WebSocket(target.webSocketDebuggerUrl);
const pending = new Map();
let sequence = 0;
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++sequence;
  pending.set(id, { resolve, reject });
  socket.send(JSON.stringify({ id, method, params }));
});

await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true });
  socket.addEventListener('error', reject, { once: true });
});
socket.addEventListener('message', ({ data }) => {
  const message = JSON.parse(data);
  if (!message.id) return;
  const request = pending.get(message.id);
  if (!request) return;
  pending.delete(message.id);
  if (message.error) request.reject(new Error(message.error.message));
  else request.resolve(message.result);
});

try {
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await send('Emulation.setUserAgentOverride', { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' });
  await send('Page.navigate', { url });
  await wait(3500);
  const screenshot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  await fs.writeFile(output, Buffer.from(screenshot.data, 'base64'));
  const evaluation = await send('Runtime.evaluate', { expression: 'JSON.stringify({width: innerWidth, height: innerHeight, text: document.body.innerText, route: location.pathname})', returnByValue: true });
  await fs.writeFile(output.replace(/\.png$/, '.json'), evaluation.result.value);
  console.log(JSON.stringify({ output, audit: output.replace(/\.png$/, '.json'), result: JSON.parse(evaluation.result.value) }, null, 2));
} finally {
  await send('Emulation.clearDeviceMetricsOverride').catch(() => {});
  await send('Emulation.setUserAgentOverride', { userAgent: '' }).catch(() => {});
  socket.close();
}
