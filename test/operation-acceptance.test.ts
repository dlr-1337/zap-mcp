import test from 'node:test';
import assert from 'node:assert/strict';
const modulePath = '../../scripts/phase4-acceptance.mjs';
const acceptance = await import(modulePath);
test('tracer operacional percorre HTTPS site ZIP MCP e restore com oráculos reais', async () => {
  const receipt = await acceptance.selfTest();
  assert.equal(receipt.flowComplete, true, 'driver must observe HTTPS login/search/context/original/ZIP/MCP and clean SQL/bytes restore');
  assert.equal(receipt.synthetic, true);
  assert.equal(receipt.accepted, false, 'synthetic flow never closes OPS');
});
