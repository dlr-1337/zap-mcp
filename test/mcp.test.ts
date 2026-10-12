import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { createService } from '../src/main.js';

test('MCP exige bearer antes de parsing e cookie não autoriza', async t => {
  const dir = mkdtempSync(join(tmpdir(), 'zap-mcp-')), s = createService({ dataDir: dir });
  const server = s.app.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(async () => { server.close(); await once(server, 'close'); await s.close(); rmSync(dir, { recursive: true }); });
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  for (const headers of [{}, { Authorization: 'Bearer wrong' }, { Cookie: 'zap.sid=synthetic' }, { 'Mcp-Session-Id': 'synthetic' }] as Record<string, string>[]) {
    const r = await fetch(base + '/mcp', { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: '{invalid' });
    assert.equal(r.status, 401, 'MCP fechado deve recusar antes de analisar JSON');
    assert.doesNotMatch(await r.text(), /synthetic|SyntaxError|stack/);
  }
});
