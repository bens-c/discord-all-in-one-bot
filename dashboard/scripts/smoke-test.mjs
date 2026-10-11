import assert from 'node:assert/strict';

const base = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3000';
const publicOrigin = new URL(process.env.DISCORD_REDIRECT_URI).origin;
const get = (path, headers) => fetch(new URL(path, base), {
  redirect: 'manual', headers, signal: AbortSignal.timeout(10_000),
});

const health = await get('/api/health');
assert.equal(health.status, 200);
assert.deepEqual(await health.json(), { status: 'ok' });

const page = await get('/');
assert.equal(page.status, 200);
assert.match(await page.text(), /Command Center/);

const anonymous = await get('/api/dashboard');
assert.equal(anonymous.status, 401);
assert.equal((await anonymous.json()).code, 'UNAUTHORIZED');

const login = await get('/api/auth/discord');
assert.equal(login.status, 307);
const location = new URL(login.headers.get('location'));
assert.equal(location.origin, 'https://discord.com');
assert.equal(location.searchParams.get('redirect_uri'), process.env.DISCORD_REDIRECT_URI);
assert.equal(location.searchParams.get('client_id'), process.env.CLIENT_ID);
const cookie = login.headers.get('set-cookie');
assert.match(cookie, /HttpOnly/);
assert.match(cookie, /Secure/);
assert.match(cookie, /SameSite=Lax/);

const callback = await get('/api/auth/callback/discord?code=fake&state=invalid');
assert.equal(callback.status, 307);
assert.equal(callback.headers.get('location'), `${publicOrigin}/?auth_error=invalid_state`);

const logout = await get('/api/auth/logout');
assert.equal(logout.status, 307);
assert.equal(logout.headers.get('location'), `${publicOrigin}/`);
assert.match(logout.headers.get('set-cookie'), /Max-Age=0/);

console.log('PASS: health, page, protected API, OAuth redirect/cookie, invalid callback and logout.');
