import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';

test('management routes through the existing dispatcher within the current function limit', async () => {
  const config = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url)));
  assert.deepEqual(config.rewrites.find(rule => rule.source === '/api/v1/manage'), {
    source: '/api/v1/manage', destination: '/api/v1/health?mode=management',
  });
  const files = await readdir(new URL('../api/', import.meta.url), { recursive: true });
  assert.equal(files.filter(file => file.endsWith('.js')).length, 12);
  assert.ok(!files.includes('v1/manage.js'));
});
