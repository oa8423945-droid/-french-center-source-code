const fs = require('fs');
const path = require('path');
const assert = require('assert/strict');
const os = require('os');
const http = require('http');
const { spawn } = require('child_process');
const XLSX = require(path.join(path.resolve(__dirname, '..'), 'node_modules/xlsx'));
const base = path.resolve(__dirname, '..');
const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'french-center-setup-'));
const port = 3237;
const origin = `http://127.0.0.1:${port}`;
fs.mkdirSync(path.join(fixture, 'data'), { recursive: true });
fs.mkdirSync(path.join(fixture, 'public'), { recursive: true });
fs.copyFileSync(path.join(base, 'server.js'), path.join(fixture, 'server.js'));
for (const file of fs.readdirSync(path.join(base, 'public'))) fs.copyFileSync(path.join(base, 'public', file), path.join(fixture, 'public', file));
fs.copyFileSync(path.join(base, 'data', 'main data 2.xlsx'), path.join(fixture, 'data', 'main data 2.xlsx'));
const template = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(template, XLSX.utils.aoa_to_sheet([['user name', 'pasword', 'الصلاحيات']]), 'Users');
XLSX.utils.book_append_sheet(template, XLSX.utils.aoa_to_sheet([['setting', 'value'], ['keep', 'this']]), 'Settings');
const usersPath = path.join(fixture, 'data', 'usre.xlsx');
XLSX.writeFile(template, usersPath);
const child = spawn(process.execPath, [path.join(fixture, 'server.js')], {
  cwd: fixture,
  env: { ...process.env, NODE_PATH: path.join(base, 'node_modules'), PORT: String(port), GARAGE_DATA_FILE: path.join(fixture, 'data', 'main data 2.xlsx') },
  windowsHide: true,
  stdio: ['ignore', 'pipe', 'pipe'],
});
child.stderr.on('data', (buffer) => process.stderr.write(buffer));
async function call(route, { method = 'GET', body, requestOrigin = origin, host = `127.0.0.1:${port}` } = {}) {
  return new Promise((resolve, reject) => {
    const payload = body === undefined ? null : Buffer.from(JSON.stringify(body));
    const request = http.request(`${origin}${route}`, {
      method,
      headers: { Host: host, Origin: requestOrigin, ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': payload.length } : {}) },
    }, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        let value;
        try { value = JSON.parse(text); } catch { value = text; }
        resolve({ status: response.statusCode, value, text });
      });
    });
    request.on('error', reject);
    if (payload) request.write(payload);
    request.end();
  });
}
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function waitForServer() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try { await fetch(`${origin}/login.html`); return; } catch { await sleep(100); }
  }
  throw new Error('Local test server failed to start.');
}
async function run() {
  await waitForServer();
  assert.equal((await call('/api/setup-status', { requestOrigin: 'http://attacker.example' })).status, 403, 'reject cross-origin setup checks');
  assert.equal((await call('/api/setup-status', { host: `localhost.evil.test:${port}` })).status, 403, 'reject attacker-controlled Host');
  assert.deepEqual((await call('/api/setup-status')).value, { setupRequired: true });
  const weak = await call('/api/setup-admin', { method: 'POST', body: { username: 'manager', password: 'short', confirmPassword: 'short' } });
  assert.equal(weak.status, 400);
  const mismatch = await call('/api/setup-admin', { method: 'POST', body: { username: 'manager', password: 'This-is-a-long-test-password', confirmPassword: 'different-password-value' } });
  assert.equal(mismatch.status, 400);
  const password = 'Private-Test-Setup-Password-2026';
  const simultaneous = await Promise.all([
    call('/api/setup-admin', { method: 'POST', body: { username: 'manager-one', password, confirmPassword: password } }),
    call('/api/setup-admin', { method: 'POST', body: { username: 'manager-two', password, confirmPassword: password } }),
  ]);
  assert.deepEqual(simultaneous.map((result) => result.status).sort(), [201, 409], 'only one first-run account wins');
  for (const result of simultaneous) assert.equal(result.text.includes(password), false, 'never echo password in response');
  const book = XLSX.readFile(usersPath);
  assert.deepEqual(XLSX.utils.sheet_to_json(book.Sheets.Users, { header: 1 })[0], ['user name', 'pasword', 'الصلاحيات']);
  const winningUsername = simultaneous.find((result) => result.status === 201).value.username;
  assert.equal(book.Sheets.Users.A2.v, winningUsername);
  assert.equal(book.Sheets.Users.C2.v, 'مدير');
  assert.ok(book.SheetNames.includes('Settings'), 'preserve other workbook sheets');
  assert.deepEqual((await call('/api/setup-status')).value, { setupRequired: false });
  assert.equal((await call('/api/setup-admin', { method: 'POST', body: { username: 'manager-three', password, confirmPassword: password } })).status, 409);

  fs.unlinkSync(usersPath);
  assert.deepEqual((await call('/api/setup-status')).value, { setupRequired: true }, 'missing user workbook should offer first-run setup');
  const fresh = await call('/api/setup-admin', { method: 'POST', body: { username: 'fresh-manager', password, confirmPassword: password } });
  assert.equal(fresh.status, 201);
  const freshBook = XLSX.readFile(usersPath);
  assert.deepEqual(XLSX.utils.sheet_to_json(freshBook.Sheets[freshBook.SheetNames[0]], { header: 1 })[0], ['user name', 'pasword', 'الصلاحيات']);
  console.log('PASS: local same-origin restriction, password confirmation and minimum, concurrent first-run race, workbook header/sheet preservation, duplicate prevention, and missing-workbook creation.');
}
run().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => {
  child.kill();
  setTimeout(() => fs.rmSync(fixture, { recursive: true, force: true }), 300);
});
