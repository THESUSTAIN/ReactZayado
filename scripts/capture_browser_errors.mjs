const url = process.argv[2] || 'https://3001-irmp9h23rxxehdh4qvdc7-a187ca6b.us5.manus.computer/';
const targets = await fetch('http://127.0.0.1:9222/json').then((response) => response.json());
const target = targets.find((item) => item.type === 'page' && item.url.includes('3001-irmp9h23rxxehdh4qvdc7-a187ca6b.us5.manus.computer')) || targets.find((item) => item.type === 'page');
if (!target?.webSocketDebuggerUrl) throw new Error('Aucune page Chromium exploitable n’a été trouvée.');

const socket = new WebSocket(target.webSocketDebuggerUrl);
const pending = new Map();
const entries = [];
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
  if (message.id) {
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id);
    if (message.error) request.reject(new Error(message.error.message));
    else request.resolve(message.result);
    return;
  }
  if (message.method === 'Log.entryAdded') entries.push({ type: 'log', ...message.params.entry });
  if (message.method === 'Runtime.exceptionThrown') entries.push({ type: 'exception', ...message.params.exceptionDetails });
});
try {
  await send('Log.enable');
  await send('Runtime.enable');
  await send('Page.navigate', { url });
  await wait(3500);
  const state = await send('Runtime.evaluate', { expression: 'JSON.stringify({root:document.querySelector("#root")?.innerHTML || "", ready:document.readyState})', returnByValue: true });
  console.log(JSON.stringify({ entries, page: JSON.parse(state.result.value) }, null, 2));
} finally {
  socket.close();
}
