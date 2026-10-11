import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const storeUrl = new URL('../src/store.js', import.meta.url);
let counter = 0;
async function isolated(run) {
  const cwd = process.cwd();
  const uri = process.env.MONGODB_URI;
  const dir = await mkdtemp(path.join(tmpdir(), 'kyrox-store-'));
  delete process.env.MONGODB_URI;
  process.chdir(dir);
  try { await run(await import(`${storeUrl}?test=${counter++}`), dir); }
  finally {
    process.chdir(cwd);
    if (uri === undefined) delete process.env.MONGODB_URI;
    else process.env.MONGODB_URI = uri;
    await rm(dir, { recursive: true, force: true });
  }
}

test('local concurrent updates persist without loss and failed mutations do not leak', async () => {
  await isolated(async (store, dir) => {
    await store.connectStore();
    await Promise.all(Array.from({ length: 20 }, () => store.mutateGuildState('guild', async s => {
      const before = s.economy.total || 0;
      await new Promise(resolve => setTimeout(resolve, 1));
      s.economy.total = before + 1;
    })));
    await assert.rejects(store.mutateGuildState('guild', s => { s.economy.total = -1; throw new Error('abort'); }));
    await store.mutateGuildState('guild', s => { s.economy.total++; });
    await store.closeStore();
    assert.equal((await store.getGuildState('guild')).economy.total, 21);
    assert.equal(JSON.parse(await readFile(path.join(dir, 'data/bot-data.json'))).guilds.guild.economy.total, 21);
  });
});

test('corrupt local data is preserved', async () => {
  await isolated(async (store, dir) => {
    await mkdir(path.join(dir, 'data'));
    const file = path.join(dir, 'data/bot-data.json');
    await writeFile(file, '{broken');
    await assert.rejects(store.connectStore());
    assert.equal(await readFile(file, 'utf8'), '{broken');
  });
});

test('all persistent data survives restart even with legacy MongoDB configuration', async () => {
  await isolated(async (store, dir) => {
    process.env.MONGODB_URI = 'invalid-uri-that-must-never-be-used';
    await store.connectStore();
    assert.deepEqual((await store.getGuildState('new')).economy, {});
    await store.mutateGuildState('guild', s => {
      s.config.welcomeEnabled = true;
      s.warnings.user = [{ reason: 'test' }];
      s.economy.user = { wallet: 42, bank: 0 };
      s.levels.user = { xp: 100, messages: 4 };
      s.giveaways.message = { entries: ['user'], ended: false };
    });
    const expected = await store.getGuildState('guild');
    await store.closeStore();
    const restarted = await import(`${storeUrl}?test=${counter++}`);
    await restarted.connectStore();
    assert.deepEqual(await restarted.getGuildState('guild'), expected);
    assert.deepEqual(await restarted.listGuildStates(), [expected]);
    assert.deepEqual(JSON.parse(await readFile(path.join(dir, 'data/bot-data.json'))).guilds.guild, expected);
    await restarted.closeStore();
  });
});
