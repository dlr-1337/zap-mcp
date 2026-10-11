import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { createService } from '../src/main.js';

const requireBrowser = createRequire(process.env.ZAP_BROWSER_MODULE ?? '/home/otavio/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json');
const { chromium } = requireBrowser('playwright');
async function uiFixture(t: any) {
  const dir = mkdtempSync(join(tmpdir(), 'zap-ui-')), s = createService({ dataDir: dir });
  const server = s.app.listen(0, '127.0.0.1'); await once(server, 'listening');
  const browser = await chromium.launch({ executablePath: process.env.ZAP_BROWSER_EXECUTABLE ?? '/usr/bin/chromium', headless: true, args: ['--no-sandbox', '--disable-gpu', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  t.after(async () => { await browser.close(); server.close(); await once(server, 'close'); await s.close(); rmSync(dir, { recursive: true }); });
  await s.setPassword('senha sintética'); const page = await browser.newPage();
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const login = async () => { await page.goto(base); await page.locator('#password').fill('senha sintética'); await page.locator('#login-button').click(); await page.locator('#archive').waitFor({ state: 'visible' }); await page.waitForFunction(() => document.getElementById('login-status')?.textContent === ''); };
  return { s, page, base, login, browser };
}
test('site encontra termo literal em evidência congelada', async t => {
  const { s, page, login } = await uiFixture(t);
  s.archive.ingestHistory({ chats: [{ id: '1@s.whatsapp.net', name: 'Homônimo' }], messages: [{ key: { remoteJid: '1@s.whatsapp.net', id: 'm', fromMe: false }, messageTimestamp: 123, privateEnvelope: 'PRIVATE_SENTINEL_NEVER_RETURN', message: { conversation: 'Orçamento café <img src=x onerror=window.EXECUTED=1>' } }] });
  await login();
  assert.equal(await page.locator('#search-form').count(), 1, 'formulário real de busca disponível');
  await page.locator('#search-terms').fill('cafe'); await page.locator('#search-submit').click();
  await page.waitForFunction(() => document.getElementById('search-results')?.children.length === 1);
  const result = page.locator('#search-results > li');
  assert.match(await result.textContent(), /Orçamento café/); assert.match(await result.textContent(), /Referência: /);
  assert.equal(await result.locator('img').count(), 0); assert.equal(await page.evaluate(() => (window as any).EXECUTED), undefined);
  assert.doesNotMatch(await page.locator('body').textContent(), /PRIVATE_SENTINEL/);
  await result.getByRole('button', { name: 'Abrir contexto' }).click();
  await page.waitForFunction(() => document.getElementById('messages')?.children.length === 1);
  assert.equal(await page.locator('#messages > li').count(), 1);
});
