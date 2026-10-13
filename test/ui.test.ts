import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { Readable } from 'node:stream';
import { startMediaWorker } from '../src/media.js';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { createService } from '../src/main.js';

const requireBrowser = createRequire(process.env.ZAP_BROWSER_MODULE ?? '/home/otavio/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json');
const { chromium } = requireBrowser('playwright');
test('pagehide e logout recusado liberam buscas candidatos e listagem sem callbacks tardios', async t => {
  const { s, page, login } = await uiFixture(t);
  s.archive.ingestHistory({ messages: [{ key: { remoteJid: 'lifecycle@lid', id: 'm', fromMe: false }, message: { conversation: 'conteúdo preservado' } }] });
  await login();
  for (const lifecycle of ['pagehide', 'logout']) for (const operation of ['search', 'candidates', 'list']) {
    if (lifecycle === 'logout') await page.route('**/logout', (r: any) => r.fulfill({ status: 500, json: {} }));
    const url = operation === 'search' ? '**/api/search?*' : operation === 'candidates' ? '**/api/conversations?q=*' : '**/api/conversations';
    let release!: () => void, begun!: () => void; const held = new Promise<void>(r => release = r), started = new Promise<void>(r => begun = r);
    await page.route(url, async (r: any) => { const response = await r.fetch(); begun(); await held; await r.fulfill({ response }); });
    if (operation === 'search') await page.locator('#search-submit').click();
    if (operation === 'candidates') await page.locator('#locate-contact').click();
    if (operation === 'list') await page.evaluate('void list()');
    await started;
    if (lifecycle === 'pagehide') { await page.evaluate(() => dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true }))); await page.evaluate(() => dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }))); await page.locator('#archive').waitFor({ state: 'visible' }); }
    else { await page.locator('#logout-button').click(); await page.waitForFunction(() => document.getElementById('archive-error')?.textContent?.includes('encerrar')); }
    const panel = operation === 'search' ? '#search-panel' : operation === 'candidates' ? '#candidate-panel' : '#conversation-panel';
    const button = operation === 'search' ? '#search-submit' : operation === 'candidates' ? '#locate-contact' : '#more-conversations';
    assert.notEqual(await page.locator(panel).getAttribute('aria-busy'), 'true', operation + '/' + lifecycle);
    assert.equal(await page.locator(button).isDisabled(), false);
    release(); await page.waitForTimeout(100); await page.unroute(url);
    assert.notEqual(await page.locator(panel).getAttribute('aria-busy'), 'true');
    if (lifecycle === 'logout') await page.unroute('**/logout');
  }
  await page.locator('#search-submit').click(); await page.waitForFunction(() => document.getElementById('search-results')?.textContent?.includes('conteúdo preservado'));
});
test('POST retido recupera o mesmo ZIP após suspensão ou logout recusado sem duplicar job', async t => {
  for (const lifecycle of ['pagehide', 'logout', 'close', 'expired', 'network']) {
    const { s, page, login, browser } = await uiFixture(t);
    try {
    s.archive.ingestHistory({ messages: [{ key: { remoteJid: 'recover@lid', id: 'm', fromMe: false }, message: { conversation: 'conteúdo do ZIP' } }] });
    await login(); await page.locator('#conversations a').click(); await page.locator('#messages article').first().waitFor();
    let release!: () => void, begun!: () => void, jobId: string;
    const held = new Promise<void>(r => release = r), started = new Promise<void>(r => begun = r); let first = true, posts = 0;
    await page.route('**/api/exports', async (r: any) => {
      if (r.request().method() !== 'POST') return r.continue();
      posts++; const response = await r.fetch();
      if (first) { first = false; jobId = (await response.json()).jobId; begun(); await held; if (lifecycle === 'network') return r.abort('failed'); }
      await r.fulfill({ response });
    });
    await page.getByRole('button', { name: 'Gerar ZIP', exact: true }).click(); await started;
    if (lifecycle === 'network') { release(); await page.getByRole('button', { name: 'Tentar conferir novamente', exact: true }).click(); }
    else if (lifecycle === 'logout') { await page.route('**/logout', (r: any) => r.fulfill({ status: 500, json: {} })); await page.locator('#logout-button').click(); await page.waitForFunction(() => document.getElementById('archive-error')?.textContent?.includes('encerrar')); }
    else {
      await page.evaluate(() => dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })));
      if (lifecycle === 'expired') s.authDb.exec('UPDATE web_sessions SET touched_at=0');
      if (lifecycle === 'close') await page.evaluate('closeTab([...tabs.values()][0])');
      await page.evaluate(() => dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
    }
    if (lifecycle === 'expired') { await page.locator('#login-panel').waitFor({ state: 'visible' }); release(); await page.waitForTimeout(100); assert.equal(await page.locator('.export-form').count(), 0); assert.equal(posts, 1); }
    else {
      await page.locator('#archive').waitFor({ state: 'visible' });
      if (lifecycle === 'close') { release(); await page.waitForTimeout(100); await page.locator('#conversations a').click(); }
      const download = page.getByRole('link', { name: 'Baixar ZIP', exact: true }); await download.waitFor();
      assert.equal(await download.getAttribute('href'), '/api/exports/' + jobId! + '/download', 'mesma criação recuperada');
      assert.equal(await page.locator('.export-form').getAttribute('aria-busy'), 'false');
      assert.equal(await page.getByRole('button', { name: 'Gerar ZIP', exact: true }).isDisabled(), false);
      release(); await page.waitForTimeout(100); assert.equal(await download.getAttribute('href'), '/api/exports/' + jobId! + '/download');
    }
    } finally { await browser.close(); }
  }
});
test('resposta anterior à suspensão não limpa o loading da nova busca', async t => {
  const { s, page, login } = await uiFixture(t);
  s.archive.ingestHistory({ messages: [{ key: { remoteJid: 'versions@lid', id: 'm', fromMe: false }, message: { conversation: 'leitura' } }] }); await login();
  const releases: (() => void)[] = []; let begun!: () => void;
  let started = new Promise<void>(r => begun = r);
  await page.route('**/api/search?*', async (r: any) => { const response = await r.fetch(); const held = new Promise<void>(resolve => releases.push(resolve)); begun(); await held; await r.fulfill({ response }); });
  await page.locator('#search-submit').click(); await started;
  await page.evaluate(() => dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })));
  await page.evaluate(() => dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }))); await page.locator('#archive').waitFor({ state: 'visible' });
  started = new Promise<void>(r => begun = r); await page.locator('#search-submit').click(); await started;
  releases[0](); await page.waitForTimeout(100); assert.equal(await page.locator('#search-panel').getAttribute('aria-busy'), 'true'); assert.equal(await page.locator('#search-submit').isDisabled(), true);
  releases[1](); await page.waitForFunction(() => document.getElementById('search-panel')?.getAttribute('aria-busy') !== 'true');
});
test('erro de datas de exportação acompanha campo focado por descrição única', async t => {
  const { s, page, login } = await uiFixture(t); s.archive.ingestHistory({ messages: [{ key: { remoteJid: 'aria@lid', id: 'm', fromMe: false }, messageTimestamp: 123, message: { conversation: 'leitura preservada' } }] });
  await login(); await page.locator('#conversations a').click(); await page.locator('#messages article').first().waitFor();
  const form = page.locator('.export-form'), from = form.locator('input').nth(0), to = form.locator('input').nth(1);
  await from.fill('2024-01-02'); await to.fill('2024-01-01'); await form.getByRole('button', { name: 'Gerar ZIP', exact: true }).click();
  assert.equal(await from.getAttribute('aria-invalid'), 'true'); assert.equal(await from.evaluate((el: any) => el === document.activeElement), true);
  assert.equal(await from.evaluate((el: any) => el.getAttribute('aria-describedby').split(/\s+/).some((id: string) => document.getElementById(id)?.textContent?.includes('A data inicial deve ser igual ou anterior'))), true, 'campo focado deve descrever seu erro');
  assert.match(await page.locator('#messages').textContent(), /leitura preservada/);
  await from.fill('2099-01-01'); await to.fill(''); await form.getByRole('button', { name: 'Gerar ZIP', exact: true }).click(); await page.waitForFunction(() => document.activeElement?.getAttribute('aria-invalid') === 'true');
  assert.equal(await from.evaluate((el: any) => el.getAttribute('aria-describedby').split(/\s+/).some((id: string) => document.getElementById(id)?.textContent?.includes('Não encontrado no acervo'))), true);
});
test('falhas de contexto e HEAD preview são alertas e repetir restaura status', async t => {
  const { s, page } = await mediaUiFixture(t);
  await page.route(/\/api\/context\//, (route: any) => route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'sintético' }) }));
  await page.locator('#refresh-conversation').click(); await page.waitForFunction(() => document.getElementById('reader-status')?.textContent?.includes('Não foi possível carregar'));
  assert.equal(await page.locator('#reader-status').getAttribute('role'), 'alert', 'erro de contexto precisa ser alert');
  await page.unroute(/\/api\/context\//); await page.route(/\/api\/context\//, (route: any) => route.abort('failed')); await page.locator('#refresh-conversation').click(); await page.waitForFunction(() => document.getElementById('reader-status')?.getAttribute('role') === 'alert');
  s.archive.ingestHistory({ messages: Array.from({ length: 181 }, (_, i) => ({ key: { remoteJid: '1@lid', id: 'aria-page-' + i, fromMe: false }, messageTimestamp: 1000 + i, message: { conversation: 'vizinha ' + i } })) });
  await page.unroute(/\/api\/context\//); await page.locator('#refresh-conversation').click(); await page.waitForFunction(() => document.getElementById('reader-status')?.textContent?.includes('mensagens carregadas')); assert.equal(await page.locator('#reader-status').getAttribute('role'), 'status');
  const previous = await page.locator('#messages li').count();
  for (const network of [false, true]) { await page.route(/\/api\/context\//, (route: any) => network ? route.abort('failed') : route.fulfill({ status: 500, contentType: 'application/json', body: '{}' })); await page.locator('#more-after').click(); await page.waitForFunction(() => document.getElementById('reader-status')?.getAttribute('role') === 'alert'); assert.equal(await page.locator('#messages li').count(), previous); await page.unroute(/\/api\/context\//); }
  await page.locator('#more-after').click(); await page.waitForFunction(() => document.getElementById('reader-status')?.getAttribute('role') === 'status' && document.getElementById('reader-status')?.textContent?.includes('mensagens carregadas'));
  await page.route(/\/api\/attachments\/.*\/preview$/, (route: any) => route.request().method() === 'HEAD' ? route.fulfill({ status: 415 }) : route.continue());
  const block = page.locator('#messages .attachment').filter({ has: page.getByRole('button', { name: 'Visualizar imagem', exact: true }) }); await block.getByRole('button', { name: 'Visualizar imagem', exact: true }).click();
  await block.locator('.preview').getByText('Sem visualização integrada para este formato.', { exact: false }).waitFor(); assert.equal(await block.locator('.preview p').getAttribute('role'), 'alert');
  await block.getByRole('button', { name: 'Fechar visualização' }).click(); await page.unroute(/\/api\/attachments\/.*\/preview$/); await page.route(/\/api\/attachments\/.*\/preview$/, (route: any) => route.abort('failed')); await block.getByRole('button', { name: 'Visualizar imagem', exact: true }).click(); await block.locator('.preview [role=alert]').waitFor();
  await block.getByRole('button', { name: 'Fechar visualização' }).click(); await page.unroute(/\/api\/attachments\/.*\/preview$/); await block.getByRole('button', { name: 'Visualizar imagem', exact: true }).click(); await page.waitForFunction(() => !!(document.querySelector('#messages .preview img') as HTMLImageElement)?.naturalWidth); assert.equal(await block.locator('.preview p').getAttribute('role'), 'status');
});
test('browser exporta conversa inteira além da página e conclui download ZIP', async t => {
  const { s, page, login } = await uiFixture(t);
  s.archive.ingestHistory({ messages: Array.from({ length: 161 }, (_, i) => ({ key: { remoteJid: 'export@lid', id: 'm' + i, fromMe: false }, messageTimestamp: 1700000000 + i, message: { conversation: 'exportável ' + i } })) });
  const bytes = Buffer.from('original para download ZIP 🧪'), key = { remoteJid: 'export@lid', id: 'original', fromMe: false };
  s.archive.ingestHistory({ messages: [{ key, messageTimestamp: 1700000001, message: { documentMessage: { fileName: '../nome repetido.bin', url: 'https://mmg.whatsapp.net/synthetic', mediaKey: Buffer.alloc(32), fileLength: bytes.length, fileSha256: createHash('sha256').update(bytes).digest() } } }] });
  const worker = startMediaWorker({ archive: s.archive, mediaDir: join(s.archiveDb.name, '..', 'media'), downloadOriginal: async () => Readable.from([bytes]) }); await worker.drain(); await worker.stop();
  await login(); await page.locator('#conversations a').click(); await page.locator('#messages article').first().waitFor();
  assert.equal(await page.getByRole('button', { name: 'Gerar ZIP', exact: true }).count(), 1, 'leitor deve oferecer exportação explícita');
  await page.getByRole('button', { name: 'Gerar ZIP', exact: true }).click();
  await page.getByRole('link', { name: 'Baixar ZIP', exact: true }).waitFor();
  const pending = page.waitForEvent('download'); await page.getByRole('link', { name: 'Baixar ZIP', exact: true }).click(); const download = await pending;
  assert.equal(await download.failure(), null); const path = await download.path();
  assert.equal(spawnSync('unzip', ['-t', path]).status, 0); const manifest = spawnSync('unzip', ['-p', path, 'manifest.json']); assert.equal(manifest.status, 0); const data = JSON.parse(manifest.stdout.toString()); assert.equal(data.messages.length, 162); const a = data.messages.flatMap((m: any) => m.attachments)[0]; const original = spawnSync('unzip', ['-p', path, a.path]); assert.equal(original.status, 0); assert.deepEqual(original.stdout, bytes); assert.equal(a.sha256, createHash('sha256').update(original.stdout).digest('hex'));
});
test('logout vence status de exportação retido e impede restauração de conteúdo', async t => {
  const { s, page, login } = await uiFixture(t); s.archive.ingestHistory({ messages: [{ key: { remoteJid: 'logout@lid', id: 'm', fromMe: false }, messageTimestamp: 123, message: { conversation: 'privado' } }] });
  await login(); await page.locator('#conversations a').click(); await page.locator('#messages article').first().waitFor();
  let release!: () => void, started!: () => void; const held = new Promise<void>(r => release = r), began = new Promise<void>(r => started = r);
  await page.route(/\/api\/exports\/[0-9a-f-]{36}$/, async (route: any) => { const response = await route.fetch(); started(); await held; await route.fulfill({ response }); });
  await page.getByRole('button', { name: 'Gerar ZIP', exact: true }).click(); await began;
  await page.locator('#logout-button').click(); await page.locator('#login-panel').waitFor({ state: 'visible' }); release(); await page.waitForTimeout(100);
  assert.equal(await page.locator('#conversation-panels').textContent(), ''); assert.equal(await page.getByRole('link', { name: 'Baixar ZIP' }).count(), 0);
});
test('exportação mostra período efetivo e recupera polling sem misturar abas UC40 a UC49', async t => {
  const { s, page, login } = await uiFixture(t);
  s.archive.ingestHistory({ chats: [{ id: 'a@lid', subject: 'A '.repeat(90) }, { id: 'b@lid', subject: 'B' }], messages: [{ key: { remoteJid: 'a@lid', id: 'a', fromMe: false }, messageTimestamp: 1700000000, message: { conversation: 'mensagem A' } }, { key: { remoteJid: 'b@lid', id: 'b', fromMe: false }, messageTimestamp: 1700000000, message: { conversation: 'mensagem B' } }] });
  const idA = s.archive.readStoredMessage({ remoteJid: 'a@lid', id: 'a', fromMe: false })!.conversationId, idB = s.archive.readStoredMessage({ remoteJid: 'b@lid', id: 'b', fromMe: false })!.conversationId;
  await login(); await page.locator('#search-from').fill('2020-01-01'); await page.locator(`a[data-id="${idA}"]`).click(); await page.locator('#messages article').first().waitFor();
  const panel = page.locator('#panel-' + idA), from = panel.locator('.export-form input').nth(0), to = panel.locator('.export-form input').nth(1);
  assert.equal(await from.inputValue(), '', 'não herda recorte de busca'); await from.fill('2018-11-04'); await to.fill('2018-11-04');
  await page.waitForTimeout(100); assert.equal(await panel.locator('.export-period').count(), 1, 'prévia usa limites efetivos antes do POST');
  await page.waitForFunction(() => document.querySelector('.export-period')?.textContent?.includes('2018-11-04T03:00:00.000Z'));
  await from.fill(''); await to.fill('');
  let fail = true, posts = 0; page.on('request', (r: any) => { if (r.url().endsWith('/api/exports') && r.method() === 'POST') posts++; });
  await page.route(/\/api\/exports\/[0-9a-f-]{36}$/, async (route: any) => fail ? route.abort('failed') : route.continue());
  await panel.getByRole('button', { name: 'Gerar ZIP', exact: true }).click(); await panel.getByRole('button', { name: 'Tentar conferir novamente', exact: true }).waitFor();
  assert.equal(await panel.getByRole('link', { name: 'Baixar ZIP' }).count(), 0); assert.match(await panel.textContent(), /Preparando ZIP/);
  await page.locator(`a[data-id="${idB}"]`).click(); await page.locator('#messages article').first().waitFor(); assert.equal(await page.locator('#panel-' + idB).getByRole('button', { name: 'Gerar ZIP', exact: true }).isDisabled(), true);
  assert.match(await page.locator('#messages').textContent(), /mensagem B/); fail = false; await page.getByRole('button', { name: 'Tentar conferir novamente', exact: true }).filter({ visible: true }).click();
  await page.getByRole('link', { name: 'Baixar ZIP', exact: true }).filter({ visible: true }).waitFor(); assert.equal(posts, 1); assert.match(await page.locator('#panel-' + idB).textContent(), /ZIP pronto — 1 mensagem, 0 arquivos incluídos, 0 anexos faltantes/);
  for (const width of [320, 768, 1280]) { await page.setViewportSize({ width, height: 900 }); assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true); await page.screenshot({ path: `dist/02-04-ui-${width}.png`, fullPage: true }); }
  await page.evaluate(() => document.styleSheets[0].insertRule(':root{font-size:200%}', document.styleSheets[0].cssRules.length)); assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true); await page.screenshot({ path: 'dist/02-04-ui-zoom200.png', fullPage: true });
});
async function uiFixture(t: any) {
  const dir = mkdtempSync(join(tmpdir(), 'zap-ui-')), s = createService({ dataDir: dir });
  const server = s.app.listen(0, '127.0.0.1'); await once(server, 'listening');
  const browser = await chromium.launch({ executablePath: process.env.ZAP_BROWSER_EXECUTABLE ?? '/usr/bin/chromium', headless: true, args: ['--no-sandbox', '--disable-gpu', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  t.after(async () => { await browser.close(); server.close(); await once(server, 'close'); await s.close(); rmSync(dir, { recursive: true }); });
  await s.setPassword('senha sintética'); const page = await browser.newPage(); page.setDefaultTimeout(10000);
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const login = async () => { await page.goto(base); await page.locator('#password').fill('senha sintética'); await page.locator('#login-button').click(); await page.locator('#archive').waitFor({ state: 'visible' }); await page.waitForFunction(() => document.getElementById('login-status')?.textContent === ''); };
  return { s, page, base, login, browser };
}
async function mediaUiFixture(t: any) {
  const f = await uiFixture(t), wav = Buffer.alloc(8044, 128);
  wav.write('RIFF', 0); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(8000, 24); wav.writeUInt32LE(8000, 28); wav.writeUInt16LE(1, 32); wav.writeUInt16LE(8, 34); wav.write('data', 36); wav.writeUInt32LE(8000, 40);
  const video = Buffer.from('GkXfo59ChoEBQveBAULygQRC84EIQoKEd2VibUKHgQJChYECGFOAZwEAAAAAAAILEU2bdLpNu4tTq4QVSalmU6yBoU27i1OrhBZUrmtTrIHWTbuMU6uEElTDZ1OsggEyTbuMU6uEHFO7a1OsggH17AEAAAAAAABZAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAVSalmsCrXsYMPQkBNgIxMYXZmNjMuMS4xMDFXQYxMYXZmNjMuMS4xMDFEiYhAeQAAAAAAABZUrmvXrgEAAAAAAABO14EBc8WIQ9hvZMJBSqucgQAitZyDdW5kiIEAhoVWX1ZQOIOBASPjg4QL68IA4JCwgRC6gRCagQJVsIRVuYEBVe6BAOwBAAAAAAAAAgAAElTDZ/pzc59jwIBnyJlFo4dFTkNPREVSRIeMTGF2ZjYzLjEuMTAxc3PVY8CLY8WIQ9hvZMJBSqtnyKBFo4dFTkNPREVSRIeTTGF2YzYzLjEuMTAxIGxpYnZweGfIoUWjiERVUkFUSU9ORIeTMDA6MDA6MDAuNDAwMDAwMDAwAB9DtnW/54EAo6OBAACAEAIAnQEqEAAQAABHCIWFiIWEiAICAAwNYAD+/6tQgKOVgQDIALEBAAUQrAAYABhYL/QACAAAHFO7a5G7j7OBALeK94EB8YIBsfCBAw==', 'base64');
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aN1kAAAAASUVORK5CYII=', 'base64');
  const unsupported = Buffer.from('AAAAIGZ0eXBpc29tAAACAGlzb21pc282aXNvMm1wNDEAAAMrbW9vdgAAAGxtdmhkAAAAAAAAAAAAAAAAAAAD6AAAAAAAAQAAAQAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAi50cmFrAAAAXHRraGQAAAADAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAABAAAAAABAAAAAQAAAAAAHKbWRpYQAAACBtZGhkAAAAAAAAAAAAAAAAAAAoAAAAAABVxAAAAAAALWhkbHIAAAAAAAAAAHZpZGUAAAAAAAAAAAAAAABWaWRlb0hhbmRsZXIAAAABdW1pbmYAAAAUdm1oZAAAAAEAAAAAAAAAAAAAACRkaW5mAAAAHGRyZWYAAAAAAAAAAQAAAAx1cmwgAAAAAQAAATVzdGJsAAAA6XN0c2QAAAAAAAAAAQAAANltcDR2AAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAABAAEABIAAAASAAAAAAAAAABEkxhdmM2My4xLjEwMSBtcGVnNAAAAAAAAAAAAAAAAAAAGP//AAAAX2VzZHMAAAAAA4CAgE4AAQAEgICAQCARAAAAAAMNQAADDUAFgICALgAAAbABAAABtYkTAAABAAAAASAAxI2IAC0AhAIUYwAAAbJMYXZjNjMuMS4xMDEGgICAAQIAAAAQcGFzcAAAAAEAAAABAAAAFGJ0cnQAAAAAAAMNQAADDUAAAAAQc3R0cwAAAAAAAAAAAAAAEHN0c2MAAAAAAAAAAAAAABRzdHN6AAAAAAAAAAAAAAAAAAAAEHN0Y28AAAAAAAAAAAAAAChtdmV4AAAAIHRyZXgAAAAAAAAAAQAAAAEAAAAAAAAAAAAAAAAAAABhdWR0YQAAAFltZXRhAAAAAAAAACFoZGxyAAAAAAAAAABtZGlyYXBwbAAAAAAAAAAAAAAAACxpbHN0AAAAJKl0b28AAAAcZGF0YQAAAAEAAAAATGF2ZjYzLjEuMTAxAAAAeG1vb2YAAAAQbWZoZAAAAAAAAAABAAAAYHRyYWYAAAAkdGZoZAAAADkAAAABAAAAAAAAA0sAAAgAAAAAEgEBAAAAAAAUdGZkdAEAAAAAAAAAAAAAAAAAACB0cnVuAAACBQAAAAIAAACAAgAAAAAAABIAAAAHAAAAIW1kYXQAAAGzABAHAAABthGBRgj2378AAAG2U8CNAAAAQ21mcmEAAAArdGZyYQEAAAAAAAABAAAAAAAAAAEAAAAAAAAAAAAAAAAAAANLAQEBAAAAEG1mcm8AAAAAAAAAQw==', 'base64');
  const files = [
    { id: 'audio', type: 'audioMessage', mime: 'audio/wav', bytes: wav }, { id: 'video', type: 'videoMessage', mime: 'video/webm', bytes: video },
    { id: 'codec', type: 'videoMessage', mime: 'video/mp4', bytes: unsupported },
    { id: 'png', type: 'imageMessage', mime: 'image/png', bytes: png }, { id: 'doc', type: 'documentMessage', mime: 'text/html', bytes: Buffer.from('<script>PRIVATE_SENTINEL</script>') },
    { id: 'pending', type: 'imageMessage', mime: 'image/png', bytes: png }, { id: 'retry', type: 'imageMessage', mime: 'image/png', bytes: png }, { id: 'missing', type: 'imageMessage', mime: 'image/png', bytes: png }
  ];
  f.s.archive.ingestHistory({ chats: [{ id: '1@lid', subject: 'A' }, { id: '2@lid', subject: 'B' }], messages: [...files.map((a, i) => ({ key: { remoteJid: '1@lid', id: a.id, fromMe: false }, messageTimestamp: 123 + i, message: { [a.type]: { caption: 'anexo ' + a.id, fileName: a.id + ' שלום ' + 'nome longo '.repeat(20), mimetype: a.mime, url: 'https://mmg.whatsapp.net/synthetic', mediaKey: Buffer.alloc(32, 1), fileLength: a.bytes.length } } })), { key: { remoteJid: '2@lid', id: 'b', fromMe: false }, message: { conversation: 'leitura B' } }] });
  const worker = startMediaWorker({ archive: f.s.archive, mediaDir: join(f.s.archiveDb.name, '..', 'media'), downloadOriginal: async job => Readable.from([files.find(a => a.id === job.message.key.id)!.bytes]) }); await worker.drain(); await worker.stop();
  for (const [id, state, reason] of [['pending', 'pending', null], ['retry', 'retry_wait', 'Falha ao obter ou verificar original'], ['missing', 'unavailable', 'Original não recebido ou mídia restrita']]) { const a = f.s.archive.readStoredMessage({ remoteJid: '1@lid', id, fromMe: false })!.attachments[0]!; f.s.archiveDb.prepare('UPDATE attachments SET state=?,reason=? WHERE id=?').run(state, reason, a.id); }
  await f.login(); await f.page.locator('#conversations a').filter({ hasText: /^A/ }).click(); await f.page.waitForFunction(() => document.getElementById('messages')?.textContent?.includes('anexo png'));
  return { ...f, files };
}
test('players nativos sob ação fallback e estados preservam original UC35 a UC39', async t => {
  const { s, page, files } = await mediaUiFixture(t);
  assert.equal(await page.getByRole('button', { name: 'Ouvir áudio', exact: true }).count(), 1, 'áudio tem ação sob demanda');
  assert.equal(await page.getByRole('button', { name: 'Assistir vídeo', exact: true }).count(), 2);
  assert.equal(await page.locator('#messages .attachment audio,#messages .attachment video').count(), 0);
  assert.match(await page.locator('#messages').textContent(), /Pendente — o original ainda não foi preservado/); assert.match(await page.locator('#messages').textContent(), /Falha recuperável/); assert.match(await page.locator('#messages').textContent(), /Indisponível/);
  assert.match(await page.locator('#messages').textContent(), /Sem visualização integrada para este formato/);
  await page.getByRole('button', { name: 'Ouvir áudio', exact: true }).click(); const audio = page.locator('#messages audio'); await audio.waitFor();
  assert.equal(await audio.getAttribute('preload'), 'none'); assert.equal(await audio.getAttribute('autoplay'), null); assert.equal(await audio.evaluate((el: any) => el.controls), true);
  await audio.evaluate((el: any) => el.play()); await page.waitForFunction(() => (document.querySelector('#messages audio') as HTMLAudioElement)?.currentTime > 0);
  await page.locator('#messages .attachment').filter({ has: page.getByRole('heading', { name: /^video שלום/ }) }).getByRole('button', { name: 'Assistir vídeo' }).click(); const video = page.locator('#messages video[aria-label^="video "]'); await video.waitFor();
  assert.equal(await video.getAttribute('preload'), 'none'); assert.equal(await video.getAttribute('autoplay'), null); assert.equal(await video.evaluate((el: any) => el.controls), true);
  await video.evaluate((el: any) => el.play()); await page.waitForFunction(() => (document.querySelector('#messages video') as HTMLVideoElement)?.videoWidth === 16);
  const codec = page.locator('#messages .attachment').filter({ has: page.getByRole('heading', { name: /^codec שלום/ }) });
  await codec.getByRole('button', { name: 'Assistir vídeo', exact: true }).click();
  await codec.locator('video').evaluate((el: any) => el.play().catch(() => {})); await page.waitForFunction(() => [...document.querySelectorAll('#messages .attachment')].some(el => el.querySelector('h3')?.textContent?.startsWith('codec ') && el.textContent?.includes('Não foi possível visualizar este formato')));
  assert.equal(await codec.locator('.download').count(), 1); assert.match(await codec.textContent(), /Disponível/);
  const codecDownload = page.waitForEvent('download'); await codec.locator('.download').click(); assert.deepEqual(readFileSync(await (await codecDownload).path()), files.find(a => a.id === 'codec')!.bytes);
  await audio.evaluate((el: any) => el.dispatchEvent(new Event('error'))); await page.waitForFunction(() => document.getElementById('messages')?.textContent?.includes('Não foi possível visualizar este formato'));
  const block = audio.locator('xpath=ancestor::section[contains(@class,"attachment")]'); assert.match(await block.textContent(), /Disponível — arquivo finalizado e verificado/);
  const event = page.waitForEvent('download'); await block.locator('.download').click(); const saved = await event; assert.deepEqual(readFileSync(await saved.path()), files[0].bytes);
  assert.equal(s.archive.readStoredMessage({ remoteJid: '1@lid', id: 'audio', fromMe: false })!.attachments[0]!.state, 'available');
  for (const width of [320, 768, 1280]) { await page.setViewportSize({ width, height: 900 }); assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)); await video.scrollIntoViewIfNeeded(); await page.screenshot({ path: 'dist/02-03-ui-' + width + '.png' }); }
  await page.setViewportSize({ width: 320, height: 900 }); await page.evaluate(() => document.documentElement.style.fontSize = '200%'); assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)); await video.scrollIntoViewIfNeeded(); await page.screenshot({ path: 'dist/02-03-ui-zoom200.png' });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.evaluate(() => { (window as any).oldMedia = [...document.querySelectorAll('#messages audio,#messages video')]; });
  await page.locator('#conversations a').filter({ hasText: /^B/ }).click(); await page.waitForFunction(() => document.getElementById('messages')?.textContent?.includes('leitura B'));
  assert.ok(await page.evaluate(() => (window as any).oldMedia.every((el: any) => el.paused && !el.hasAttribute('src'))), 'troca de aba libera src/players');
});
test('HEAD retido close switch logout expiração e pagehide impedem GET tardio', async t => {
  const { s, page } = await mediaUiFixture(t); let gets = 0;
  page.on('request', (r: any) => { if (r.url().endsWith('/preview') && r.method() === 'GET') gets++; });
  for (const action of ['close', 'switch', 'pagehide', 'logout', 'expire']) {
    if (action === 'expire') { await page.goto(page.url().split('?')[0]); await page.locator('#password').fill('senha sintética'); await page.locator('#login-button').click(); await page.locator('#archive').waitFor({ state: 'visible' }); await page.locator('#conversations a').filter({ hasText: /^A/ }).click(); await page.waitForFunction(() => document.getElementById('messages')?.textContent?.includes('anexo png')); }
    let release!: () => void, begun!: () => void; const held = new Promise<void>(r => release = r), started = new Promise<void>(r => begun = r);
    await page.route('**/api/attachments/*/preview', async (route: any) => { const response = await route.fetch(); begun(); await held; await route.fulfill({ response }); });
    await page.getByRole('button', { name: 'Visualizar imagem', exact: true }).click(); await started; assert.match(await page.locator('#messages .preview').textContent(), /Carregando visualização/);
    if (action === 'close') await page.getByRole('button', { name: 'Fechar visualização', exact: true }).click();
    if (action === 'switch') await page.locator('#conversations a').filter({ hasText: /^B/ }).click();
    if (action === 'pagehide') await page.evaluate(() => dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })));
    if (action === 'logout') await page.locator('#logout-button').click();
    if (action === 'expire') { s.authDb.exec('UPDATE web_sessions SET touched_at=0'); await page.evaluate(() => dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }))); await page.locator('#login-panel').waitFor({ state: 'visible' }); }
    release(); await page.waitForTimeout(100); await page.unroute('**/api/attachments/*/preview'); assert.equal(gets, 0, action + ' não permite GET tardio'); assert.equal(await page.locator('.preview [src]').count(), 0);
    if (action === 'switch') await page.getByRole('tab', { name: /^A ·/ }).click();
    if (action === 'pagehide') { await page.evaluate(() => dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }))); await page.locator('#archive').waitFor({ state: 'visible' }); }
  }
});
test('imagem preservada abre somente após clique e download conserva hash', async t => {
  const { s, page, login } = await uiFixture(t);
  const bytes = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aN1kAAAAASUVORK5CYII=', 'base64');
  const key = { remoteJid: '1@lid', id: 'png', fromMe: false };
  s.archive.ingestHistory({ messages: [{ key, messageTimestamp: 123, message: { imageMessage: { mimetype: 'image/png', caption: 'imagem preservada', fileName: 'imagem.png', url: 'https://mmg.whatsapp.net/synthetic', mediaKey: Buffer.alloc(32, 1), fileLength: bytes.length, fileSha256: createHash('sha256').update(bytes).digest() } } }] });
  const worker = startMediaWorker({ archive: s.archive, mediaDir: join(s.archiveDb.name, '..', 'media'), downloadOriginal: async () => Readable.from([bytes]) }); await worker.drain(); await worker.stop();
  let gets = 0; page.on('request', (r: any) => { if (/\/api\/attachments\//.test(r.url()) && r.method() === 'GET') gets++; });
  await login(); await page.locator('#conversations a').click(); await page.waitForFunction(() => document.getElementById('messages')?.textContent?.includes('imagem preservada'));
  assert.equal(gets, 0, 'lista/contexto não transfere binários');
  assert.equal(await page.getByRole('button', { name: 'Visualizar imagem', exact: true }).count(), 1, 'imagem tem ação explícita');
  await page.getByRole('button', { name: 'Visualizar imagem', exact: true }).click();
  await page.waitForFunction(() => { const img = document.querySelector('#messages .preview img') as HTMLImageElement; return img?.naturalWidth === 1; }); assert.equal(gets, 1);
  assert.equal(await page.locator('#messages .preview img').getAttribute('alt'), 'imagem.png');
  const saved = page.waitForEvent('download'); await page.locator('#messages .download').click(); const download = await saved; const path = await download.path(); assert.deepEqual(readFileSync(path), bytes); assert.equal(createHash('sha256').update(readFileSync(path)).digest('hex'), createHash('sha256').update(bytes).digest('hex'));
  await page.getByRole('button', { name: 'Fechar visualização', exact: true }).click(); assert.equal(await page.locator('#messages .preview [src]').count(), 0);
  assert.equal(await page.getByRole('button', { name: 'Visualizar imagem', exact: true }).evaluate((el: any) => el === document.activeElement), true);
});
test('resultado distante abre âncora e duas leituras independentes', async t => {
  const { s, page, login } = await uiFixture(t);
  const a = Array.from({ length: 181 }, (_, i) => ({ key: { remoteJid: '1@lid', id: 'm' + i, fromMe: false }, messageTimestamp: 1700000000 + i, message: { conversation: i === 80 ? 'âncora orçamento' : 'vizinha ' + i } }));
  s.archive.ingestHistory({ chats: [{ id: '1@lid', subject: 'Conversa A' }, { id: '2@lid', subject: 'Conversa B' }], messages: [...a, { key: { remoteJid: '2@lid', id: 'b', fromMe: false }, message: { conversation: 'leitura B' } }] });
  const ref = s.archive.readStoredMessage(a[80].key)!.reference;
  await login(); await page.locator('#search-terms').fill('orçamento'); await page.locator('#search-submit').click(); await page.waitForFunction(() => document.getElementById('search-results')?.children.length === 1);
  await page.getByRole('button', { name: 'Abrir contexto' }).click();
  await page.waitForFunction(() => document.getElementById('reader')?.getAttribute('aria-busy') !== 'true');
  assert.equal(await page.locator('[data-anchor="true"][data-reference="' + ref + '"]').count(), 1, 'mensagem distante ancorada');
  assert.equal(await page.locator('#messages > li').count(), 51);
  await page.locator('#conversations a').filter({ hasText: 'Conversa B' }).click();
  await page.waitForFunction(() => document.getElementById('messages')?.textContent?.includes('leitura B'));
  assert.equal(await page.getByRole('tab').count(), 2);
  await page.getByRole('tab', { name: /Conversa A/ }).click();
  assert.equal(await page.locator('#messages > li').count(), 51); assert.match(await page.locator('#messages').textContent(), /âncora orçamento/);
  assert.equal(await page.locator('#messages [data-anchor=true]').getAttribute('tabindex'), '-1');
  await page.locator('#more-messages').click(); await page.waitForFunction(() => document.getElementById('messages')?.children.length === 101);
  await page.locator('#more-after').click(); await page.waitForFunction(() => document.getElementById('messages')?.children.length === 151);
  assert.equal(await page.locator('#messages > li').evaluateAll((els: any[]) => new Set(els.map(el => el.dataset.reference)).size), 151);
  await page.getByRole('tab', { name: /Conversa B/ }).click(); assert.match(await page.locator('#messages').textContent(), /leitura B/);
  await page.getByRole('tab', { name: /Conversa A/ }).click(); assert.equal(await page.locator('#messages > li').count(), 151);
});

test('resposta retida de A não ativa A sobre B e fechar A invalida sua geração', async t => {
  const { s, page, login } = await uiFixture(t);
  s.archive.ingestHistory({ chats: [{ id: '1@lid', subject: 'A' }, { id: '2@lid', subject: 'B' }], messages: ['1@lid', '2@lid'].map((id, i) => ({ key: { remoteJid: id, id: 'm', fromMe: false }, messageTimestamp: 123, message: { conversation: 'leitura ' + (i ? 'B' : 'A') } })) });
  await login(); await page.locator('#conversations a').filter({ hasText: /^A/ }).click(); await page.waitForFunction(() => document.getElementById('messages')?.textContent?.includes('leitura A'));
  await page.locator('#conversations a').filter({ hasText: /^B/ }).click(); await page.waitForFunction(() => document.getElementById('messages')?.textContent?.includes('leitura B'));
  await page.getByRole('tab', { name: /^A ·/ }).click();
  const ref = s.archive.readStoredMessage({ remoteJid: '1@lid', id: 'm', fromMe: false })!.reference;
  let release!: () => void, started!: () => void; let gate = new Promise<void>(r => release = r), begun = new Promise<void>(r => started = r);
  await page.route('**/api/context/' + ref + '?*', async (route: any) => { const response = await route.fetch(); started(); await gate; await route.fulfill({ response }); });
  await page.locator('#refresh-conversation').click(); await begun; await page.getByRole('tab', { name: /^B ·/ }).click(); release();
  await page.waitForFunction(() => ![...document.querySelectorAll('[role=tabpanel]')].some(p => p.getAttribute('aria-busy') === 'true'));
  assert.match(await page.getByRole('tab', { selected: true }).textContent(), /^B ·/, 'resposta A não troca seleção B');
  assert.match(await page.locator('#messages').textContent(), /leitura B/);
  await page.getByRole('tab', { name: /^A ·/ }).click(); gate = new Promise<void>(r => release = r); begun = new Promise<void>(r => started = r);
  await page.locator('#refresh-conversation').click(); await begun;
  assert.equal(await page.getByRole('button', { name: /^Fechar conversa: A ·/ }).count(), 1, 'fechamento explícito disponível');
  await page.getByRole('button', { name: /^Fechar conversa: A ·/ }).click(); release(); await page.waitForTimeout(100);
  assert.equal(await page.getByRole('tab').count(), 1); assert.match(await page.locator('#messages').textContent(), /leitura B/);
  assert.deepEqual(await page.evaluate(() => ({ local: { ...localStorage }, session: { ...sessionStorage } })), { local: {}, session: {} });
});

test('logout vence resposta de contexto retida e bfcache exige sessão atual', async t => {
  const { s, page, login } = await uiFixture(t);
  s.archive.ingestHistory({ messages: [{ key: { remoteJid: '1@lid', id: 'm', fromMe: false }, messageTimestamp: 123, message: { conversation: 'privado da aba' } }] });
  await login(); await page.locator('#conversations a').click(); await page.waitForFunction(() => document.getElementById('messages')?.textContent?.includes('privado da aba'));
  let release!: () => void, started!: () => void; const gate = new Promise<void>(r => release = r), begun = new Promise<void>(r => started = r);
  await page.route('**/api/context/*?*', async (route: any) => { const response = await route.fetch(); started(); await gate; await route.fulfill({ response }); });
  await page.locator('#refresh-conversation').click(); await begun; await page.locator('#logout-button').click(); await page.locator('#login-panel').waitFor({ state: 'visible' }); release(); await page.waitForTimeout(100);
  assert.equal(await page.getByRole('tab').count(), 0); assert.equal(await page.locator('#messages > li').count(), 0); assert.doesNotMatch(await page.locator('body').textContent(), /privado da aba/);
  await page.unroute('**/api/context/*?*'); await login(); await page.locator('#conversations a').click(); await page.waitForFunction(() => document.getElementById('messages')?.textContent?.includes('privado da aba'));
  await page.evaluate(() => dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true }))); assert.equal(await page.locator('#archive').isVisible(), false);
  s.authDb.exec('UPDATE web_sessions SET touched_at=0');
  await page.evaluate(() => dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }))); await page.waitForFunction(() => document.getElementById('login-error')?.textContent?.includes('expirou'));
  assert.equal(await page.getByRole('tab').count(), 0); assert.equal(await page.locator('#archive').isVisible(), false); assert.doesNotMatch(await page.locator('body').textContent(), /privado da aba/);
});

test('abas usam teclado foco separado fechamento scroll e reflow UC23 a UC34', async t => {
  const { s, page, login } = await uiFixture(t);
  const names = ['A', 'B', 'C'].map(n => n + ' שלום 🧪 ' + 'nome longo '.repeat(30));
  s.archive.ingestHistory({ chats: names.map((name, i) => ({ id: (i + 1) + '@lid', subject: name })), messages: names.flatMap((_, i) => Array.from({ length: 81 }, (_, n) => ({ key: { remoteJid: (i + 1) + '@lid', id: 'm' + n, fromMe: false }, messageTimestamp: 123 + n, message: { conversation: 'leitura ' + i + ' linha' + n + ' ' + 'texto longo שלום '.repeat(10) } }))) });
  await login(); assert.match(await page.locator('#reader-status').textContent(), /Abra uma conversa/);
  for (const prefix of ['A', 'B', 'C']) { await page.locator('#conversations a').filter({ hasText: new RegExp('^' + prefix) }).click(); await page.waitForFunction(() => document.getElementById('reader')?.getAttribute('aria-busy') !== 'true'); }
  const controls = page.getByRole('tab'); assert.equal(await controls.count(), 3); await controls.nth(0).click();
  await controls.nth(0).focus(); await page.keyboard.press('ArrowRight');
  assert.equal(await controls.nth(1).evaluate((el: any) => el === document.activeElement), true, 'seta move foco para segunda aba');
  assert.equal(await controls.nth(0).getAttribute('aria-selected'), 'true', 'foco não ativa');
  assert.deepEqual(await controls.evaluateAll((els: any[]) => els.map(e => e.tabIndex)), [-1, 0, -1]);
  await page.keyboard.press('End'); assert.equal(await controls.nth(2).evaluate((el: any) => el === document.activeElement), true);
  await page.keyboard.press('Home'); assert.equal(await controls.nth(0).evaluate((el: any) => el === document.activeElement), true);
  await page.keyboard.press('ArrowRight'); await page.keyboard.press('Enter'); assert.equal(await controls.nth(1).getAttribute('aria-selected'), 'true');
  assert.equal(await page.locator('[role=tabpanel]:visible').count(), 1);
  assert.equal(await page.evaluate(() => { const ids = [...document.querySelectorAll('[id]')].map(e => e.id); return ids.length === new Set(ids).size; }), true, 'IDs DOM únicos');
  const barPosition = await page.locator('#conversation-tabs').evaluate((el: any) => el.getBoundingClientRect().top + scrollY);
  await page.evaluate((y: number) => window.scrollTo(0, y), barPosition + 1600); const scrollB = await page.evaluate(() => scrollY);
  const contentB = await page.locator('#messages').innerHTML();
  await controls.nth(0).click(); await page.evaluate((y: number) => window.scrollTo(0, y), barPosition + 2200); const scrollA = await page.evaluate(() => scrollY);
  const contentA = await page.locator('#messages').innerHTML();
  await controls.nth(1).click(); assert.ok(Math.abs((await page.evaluate(() => scrollY)) - scrollB) < 2, 'clique nativo B restaura posição medida antes do gesto'); assert.equal(await page.locator('#messages').innerHTML(), contentB);
  await controls.nth(0).click(); assert.ok(Math.abs((await page.evaluate(() => scrollY)) - scrollA) < 2, 'clique nativo A restaura posição medida antes do gesto'); assert.equal(await page.locator('#messages').innerHTML(), contentA);
  const anchor = page.locator('#messages [data-anchor=true]'), top = await anchor.evaluate((el: any) => el.getBoundingClientRect().top);
  await page.locator('#more-messages').evaluate((el: any) => el.click()); await page.waitForFunction(() => document.getElementById('messages')?.children.length === 76);
  assert.ok(Math.abs((await anchor.evaluate((el: any) => el.getBoundingClientRect().top)) - top) < 2, 'prepend conserva âncora');
  const originalA = await page.locator('#messages').textContent(); await controls.nth(1).click();
  s.archive.ingestHistory({ messages: [{ key: { remoteJid: '2@lid', id: 'new', fromMe: false }, messageTimestamp: 250, message: { conversation: 'nova B por atualização explícita' } }] });
  await page.locator('#refresh-conversation').click(); await page.waitForFunction(() => document.getElementById('messages')?.textContent?.includes('nova B por atualização explícita'));
  await controls.nth(0).click(); assert.equal(await page.locator('#messages').textContent(), originalA, 'refresh B preserva DTO/DOM A');
  await page.route('**/api/context/*?*', (r: any) => r.fulfill({ status: 500, json: { error: 'Solicitação não concluída' } })); await page.locator('#refresh-conversation').click(); await page.waitForFunction(() => document.getElementById('reader-status')?.textContent?.startsWith('Não foi possível carregar'));
  assert.equal(await page.locator('#messages').textContent(), originalA); await page.unroute('**/api/context/*?*');
  for (const width of [320, 768, 1280]) { await page.setViewportSize({ width, height: 900 }); assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'sem overflow' + width); await page.locator('#conversation-tabs').scrollIntoViewIfNeeded(); await page.screenshot({ path: 'dist/02-02-ui-' + width + '.png' }); }
  await page.setViewportSize({ width: 320, height: 900 }); await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; }); assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)); await page.locator('#conversation-tabs').scrollIntoViewIfNeeded(); await page.screenshot({ path: 'dist/02-02-ui-zoom200.png' });
  await page.locator('#back').click(); assert.equal(await page.locator('#search-panel').isVisible(), true); await page.locator('#conversations a').filter({ hasText: /^A/ }).click(); assert.equal(await page.locator('#messages').textContent(), originalA);
  await controls.nth(0).focus(); await page.keyboard.press('Delete'); assert.equal(await controls.count(), 2); assert.match(await page.getByRole('tab', { selected: true }).textContent(), /^B/);
  await page.keyboard.press('Delete'); assert.equal(await controls.count(), 1); await page.keyboard.press('Delete'); assert.equal(await controls.count(), 0);
  assert.equal(await page.evaluate(() => document.activeElement?.closest('#conversations') !== null), true); assert.match(await page.locator('#reader-status').textContent(), /Abra uma conversa/);
});
test('G-02-6 gesto nativo teclado âncora fechamento e nomes completos em tela baixa', async t => {
  const { s, page, login } = await uiFixture(t);
  const names = ['A', 'B', 'C'].map(n => n + ' שלום 🧪 ' + 'nome longo '.repeat(30));
  s.archive.ingestHistory({ chats: names.map((subject, i) => ({ id: (i + 1) + '@lid', subject })), messages: names.flatMap((_, i) => Array.from({ length: 81 }, (_, n) => ({ key: { remoteJid: (i + 1) + '@lid', id: 'm' + n, fromMe: false }, messageTimestamp: 123 + n, message: { conversation: 'leitura ' + i + ' linha ' + n } }))) });
  await login();
  for (const prefix of ['A', 'B', 'C']) { await page.locator('#conversations a').filter({ hasText: new RegExp('^' + prefix) }).click(); await page.waitForFunction(() => document.getElementById('reader')?.getAttribute('aria-busy') !== 'true'); }
  const controls = page.getByRole('tab'), bar = page.locator('#conversation-tabs');
  for (const font of ['100%', '200%']) for (const width of [320, 768, 1280]) {
    await page.setViewportSize({ width, height: 480 }); await page.evaluate((size: string) => document.documentElement.style.fontSize = size, font);
    await controls.nth(0).click();
    const base = await bar.evaluate((el: any) => el.getBoundingClientRect().top + scrollY);
    await page.evaluate((y: number) => window.scrollTo(0, y), base + 1600); const a = await page.evaluate(() => scrollY), contentA = await page.locator('#messages').innerHTML();
    for (const key of ['End', 'Home', 'ArrowRight', 'ArrowLeft', 'End']) {
      await page.keyboard.press(key); assert.ok(Math.abs(await page.evaluate(() => scrollY) - a) < 2, 'foco sem mover leitura ' + key + '/' + width + '/' + font);
      assert.equal(await controls.nth(0).getAttribute('aria-selected'), 'true');
      const focused = page.locator('[role=tab]:focus');
      assert.ok(await focused.evaluate((el: any) => { const r = el.getBoundingClientRect(), b = el.parentElement.parentElement.getBoundingClientRect(); return r.top - 4 >= b.top && r.bottom + 4 <= b.bottom && r.left >= b.left && r.right <= b.right && getComputedStyle(el).outlineWidth === '2px'; }), 'foco/contorno alcançáveis');
    }
    await page.keyboard.press('Enter'); assert.equal(await controls.nth(2).getAttribute('aria-selected'), 'true');
    await controls.nth(1).click(); await page.evaluate((y: number) => window.scrollTo(0, y), base + 2200); const b = await page.evaluate(() => scrollY), contentB = await page.locator('#messages').innerHTML();
    for (let round = 0; round < 2; round++) {
      await controls.nth(0).click(); assert.ok(Math.abs(await page.evaluate(() => scrollY) - a) < 2, 'A/B/A nativo'); assert.equal(await page.locator('#messages').innerHTML(), contentA);
      await page.keyboard.press('ArrowRight'); assert.ok(Math.abs(await page.evaluate(() => scrollY) - a) < 2); await page.keyboard.press('Space');
      assert.ok(Math.abs(await page.evaluate(() => scrollY) - b) < 2, 'B/A/B teclado'); assert.equal(await page.locator('#messages').innerHTML(), contentB);
    }
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'sem overflow do documento');
    assert.ok(await bar.evaluate((el: any) => { const r = el.getBoundingClientRect(); return r.top >= 0 && r.height <= innerHeight / 2 && getComputedStyle(el).backgroundColor === 'rgb(255, 255, 255)'; }), 'barra limitada e opaca');
    for (const index of [0, 2]) {
      await controls.nth(1).press(index === 0 ? 'Home' : 'End');
      const target = controls.nth(index === 0 ? 0 : 2);
      assert.match(await target.textContent(), new RegExp('^' + names[index === 0 ? 0 : 2]));
      assert.ok(await target.evaluate((el: any) => { const r = el.getBoundingClientRect(); return r.width >= 48 && r.height >= 48 && getComputedStyle(el).userSelect === 'text' && el.scrollHeight > el.clientHeight; }), 'nome integral rolável e selecionável');
      const readingPosition = await page.evaluate(() => scrollY);
      await target.hover(); await page.mouse.wheel(0, 10000);
      await page.waitForFunction(() => { const el = document.querySelector('[role=tab]:focus')!; return el.scrollTop + el.clientHeight >= el.scrollHeight - 2; });
      assert.ok(Math.abs(await page.evaluate(() => scrollY) - readingPosition) < 2, 'rolagem do nome permanece local');
      const close = target.locator('..').getByRole('button', { name: /^Fechar conversa/ });
      assert.ok(await close.evaluate((el: any) => { const r = el.getBoundingClientRect(), b = el.parentElement.parentElement.getBoundingClientRect(); return r.width >= 48 && r.height >= 48 && r.top >= b.top && r.bottom <= b.bottom && r.bottom <= innerHeight; }), 'Fechar 48px desobstruído');
    }
    await page.locator('#refresh-conversation').click(); await page.waitForFunction(() => document.getElementById('reader')?.getAttribute('aria-busy') !== 'true');
    const geometry = await page.locator('#messages [data-anchor=true]').evaluate((el: any) => { const r = el.getBoundingClientRect(), b = document.getElementById('conversation-tabs')!.getBoundingClientRect(); return { top: r.top, height: r.height, barBottom: b.bottom }; });
    assert.ok(geometry.top >= geometry.barBottom && geometry.top < 480, 'início da âncora visível abaixo da barra ' + width + '/' + font + ' ' + JSON.stringify(geometry));
    t.diagnostic('reflow ' + width + 'x480/' + font + ' PASS ' + JSON.stringify(geometry));
  }
  await controls.nth(0).click(); await page.evaluate(() => window.scrollBy(0, 1600));
  await controls.nth(0).locator('..').getByRole('button', { name: /^Fechar conversa/ }).click(); assert.equal(await controls.count(), 2); assert.equal(await controls.nth(0).evaluate((el: any) => el === document.activeElement), true, 'fechar ativa próxima');
  await page.keyboard.press('End'); await page.keyboard.press('Delete'); assert.equal(await controls.count(), 1); assert.equal(await controls.nth(0).evaluate((el: any) => el === document.activeElement), true, 'fechar última ativa anterior');
  await page.keyboard.press('Delete'); assert.equal(await controls.count(), 0); assert.equal(await page.evaluate(() => document.activeElement?.closest('#conversations') !== null), true);
  assert.equal(await page.evaluate(() => localStorage.length + sessionStorage.length), 0);
});
test('site encontra termo literal em evidência congelada', async t => {
  const { s, page, login } = await uiFixture(t);
  s.archive.ingestHistory({ chats: [{ id: '1@s.whatsapp.net', name: 'Homônimo' }], messages: [{ key: { remoteJid: '1@s.whatsapp.net', id: 'm', fromMe: false }, messageTimestamp: 123, privateEnvelope: 'PRIVATE_SENTINEL_NEVER_RETURN', message: { conversation: 'Orçamento café <img src=x onerror=window.EXECUTED=1>' } }] });
  s.archive.ingestUpdates([{ key: { remoteJid: '1@s.whatsapp.net', id: 'm', fromMe: false }, update: { message: { conversation: 'texto atual' }, messageTimestamp: 124 } }]);
  await login();
  assert.equal(await page.locator('#search-form').count(), 1, 'formulário real de busca disponível');
  await page.locator('#search-terms').fill('cafe'); await page.locator('#search-submit').click();
  await page.waitForFunction(() => document.getElementById('search-results')?.children.length === 1);
  const result = page.locator('#search-results > li');
  assert.match(await result.textContent(), /Orçamento café/); assert.match(await result.textContent(), /Referência: /);
  assert.match(await result.textContent(), /Correspondência em conteúdo anteriormente capturado — registro histórico/); assert.match(await result.textContent(), /texto atual/); assert.match(await page.locator('#search-status').textContent(), /1 resultado carregado/);
  assert.equal(await result.locator('img').count(), 0); assert.equal(await page.evaluate(() => (window as any).EXECUTED), undefined);
  assert.doesNotMatch(await page.locator('body').textContent(), /PRIVATE_SENTINEL/);
  await result.getByRole('button', { name: 'Abrir contexto' }).click();
  await page.waitForFunction(() => document.getElementById('messages')?.children.length === 1);
  assert.equal(await page.locator('#messages > li').count(), 1);
});

test('DOM candidatos zero um falha buscas loading termos inválidos e logout recusam resposta antiga', async t => {
  const { s, page, login } = await uiFixture(t);
  s.archive.ingestHistory({ contacts: [{ id: '1@lid', name: 'Única' }], messages: [{ key: { remoteJid: '1@lid', id: 'm', fromMe: false }, message: { conversation: 'relógio desconhecido' } }] });
  await login(); await page.locator('#contact-query').fill('ausente'); await page.locator('#locate-contact').click();
  await page.waitForFunction(() => document.getElementById('candidate-status')?.textContent?.startsWith('Não encontrado'));
  assert.equal(await page.locator('#contact-candidates > li').count(), 0);
  await page.locator('#contact-query').fill('Única'); await page.locator('#locate-contact').click();
  await page.waitForFunction(() => document.getElementById('contact-candidates')?.children.length === 1);
  assert.equal(await page.locator('#candidate-status').textContent(), '1 conversa localizada');
  await page.route('**/api/conversations?q=*', (r: any) => r.fulfill({ status: 500, json: { error: 'Solicitação não concluída' } }));
  await page.locator('#locate-contact').click(); await page.waitForFunction(() => document.getElementById('contact-error')?.textContent?.startsWith('Não foi possível localizar'));
  assert.equal(await page.locator('#contact-candidates > li').count(), 1); await page.unroute('**/api/conversations?q=*');
  await page.locator('#all-archive').click();
  await page.locator('#search-terms').fill('!!!'); await page.locator('#search-submit').click(); assert.match(await page.locator('#search-error').textContent(), /25 termos/); assert.equal(await page.evaluate(() => document.activeElement?.id), 'search-terms');
  await page.locator('#search-terms').fill('desconhecido'); await page.locator('#search-submit').click(); await page.waitForFunction(() => document.getElementById('search-results')?.children.length === 1);
  assert.match(await page.locator('#search-results').textContent(), /Não informado pela origem/);
  let release!: () => void, started!: () => void, delivered!: () => void; const gate = new Promise<void>(r => release = r), begun = new Promise<void>(r => started = r), done = new Promise<void>(r => delivered = r);
  await page.route('**/api/search?*', async (route: any) => { const response = await route.fetch(); started(); await gate; await route.fulfill({ response }); delivered(); });
  await page.locator('#refresh-search').click(); await begun;
  assert.equal(await page.locator('#search-panel').getAttribute('aria-busy'), 'true'); assert.equal(await page.locator('#search-status').textContent(), 'Buscando mensagens…'); assert.equal(await page.locator('#search-submit').isDisabled(), true);
  await page.locator('#logout-button').click(); await page.locator('#login-panel').waitFor({ state: 'visible' }); release(); await done; await page.unroute('**/api/search?*');
  await page.waitForTimeout(50); assert.equal(await page.locator('#search-results > li').count(), 0); assert.equal(await page.locator('#archive').isVisible(), false);
  assert.deepEqual(await page.evaluate(() => ({ local: { ...localStorage }, session: { ...sessionStorage } })), { local: {}, session: {} });
});

test('contatos homônimos e estados UC01 a UC22 usam DOM acessível e recorte estável', async t => {
  const { s, page, login } = await uiFixture(t);
  const long = 'Homônimo שלום 🧪 ' + 'muito longo '.repeat(60);
  s.archive.ingestHistory({ chats: [{ id: '1@s.whatsapp.net', subject: long }, { id: '2@g.us', subject: long }], messages: Array.from({ length: 106 }, (_, i) => ({ key: { remoteJid: i === 0 ? '2@g.us' : '1@s.whatsapp.net', id: 'm' + i, fromMe: false, participant: '3@s.whatsapp.net' }, messageTimestamp: 1541300400, privateEnvelope: 'PRIVATE_SENTINEL_NEVER_RETURN', message: { documentMessage: { caption: 'café שלום <script>window.EXECUTED=1</script>', fileName: '../../arquivo שלום.pdf' } } })) });
  await login();
  assert.equal(await page.locator('#contact-query').count(), 1, 'seletor de contato nativo disponível');
  assert.match(await page.locator('#search-status').textContent(), /Campos vazios buscam todo o acervo/);
  await page.locator('#contact-query').fill('Homônimo'); await page.locator('#search-submit').click();
  assert.match(await page.locator('#contact-error').textContent(), /Escolha uma conversa/);
  assert.equal(await page.locator('#contact-query').getAttribute('aria-invalid'), 'true');
  assert.equal(await page.evaluate(() => document.activeElement?.id), 'contact-query');
  let release!: () => void; const gate = new Promise<void>(r => release = r);
  await page.route('**/api/conversations?q=*', async (route: any) => { await gate; await route.continue(); });
  await page.locator('#locate-contact').click(); await page.waitForFunction(() => document.getElementById('candidate-panel')?.getAttribute('aria-busy') === 'true');
  assert.equal(await page.locator('#candidate-status').textContent(), 'Localizando conversas…'); release();
  await page.waitForFunction(() => document.getElementById('contact-candidates')?.children.length === 2); await page.unroute('**/api/conversations?q=*');
  assert.match(await page.locator('#contact-candidates').textContent(), /Individual/); assert.match(await page.locator('#contact-candidates').textContent(), /Grupo/);
  assert.equal(await page.locator('#contact-candidates [dir=auto]').count(), 2);
  await page.locator('#contact-candidates button').first().click();
  await page.locator('#search-terms').fill('cafe'); await page.locator('#search-from').fill('2018-11-04'); await page.locator('#search-to').fill('2018-11-04');
  await page.locator('#search-submit').click(); await page.waitForFunction(() => document.getElementById('search-panel')?.getAttribute('aria-busy') !== 'true');
  assert.match(await page.locator('#search-scope').textContent(), /Conversa:.*America\/Sao_Paulo/);
  await page.locator('#search-utc summary').click(); assert.match(await page.locator('#search-utc').textContent(), /2018-11-04T03:00:00.000Z/);
  const selection = await page.locator('#search-results > li').count(); assert.ok(selection === 1 || selection === 50);
  await page.locator('#search-from').fill('2018-11-05'); await page.locator('#search-submit').click();
  assert.match(await page.locator('#search-error').textContent(), /Confira as datas/); assert.equal(await page.evaluate(() => document.activeElement?.id), 'search-from');
  assert.equal(await page.locator('#search-results > li').count(), selection);
  await page.locator('#all-archive').click(); assert.equal(await page.locator('#contact-query').inputValue(), '');
  await page.locator('#search-from').fill(''); await page.locator('#search-to').fill(''); await page.locator('#search-terms').fill('não corresponde');
  await page.locator('#search-submit').click(); await page.waitForFunction(() => document.getElementById('search-empty')?.hidden === false);
  assert.equal(await page.locator('#search-empty h3').textContent(), 'Não encontrado no acervo');
  await page.locator('#search-terms').fill(''); await page.locator('#search-submit').click(); await page.waitForFunction(() => document.getElementById('search-results')?.children.length === 50);
  assert.match(await page.locator('#search-status').textContent(), /50 resultados carregados/);
  await page.locator('#more-results').click(); await page.waitForFunction(() => document.getElementById('search-results')?.children.length === 100);
  await page.locator('#more-results').click(); await page.waitForFunction(() => document.getElementById('search-results')?.children.length === 106);
  assert.match(await page.locator('#search-status').textContent(), /Todos os resultados deste recorte foram carregados/);
  await page.route('**/api/search?*', (route: any) => route.fulfill({ status: 500, json: { error: 'Solicitação não concluída' } }));
  await page.locator('#refresh-search').click(); await page.waitForFunction(() => document.getElementById('search-error')?.textContent?.startsWith('Não foi possível buscar'));
  assert.equal(await page.locator('#search-results > li').count(), 106); assert.match(await page.locator('#search-status').textContent(), /desatualizado/);
  await page.unroute('**/api/search?*'); await page.locator('#refresh-search').click(); await page.waitForFunction(() => document.getElementById('search-results')?.children.length === 50);
  s.archiveDb.exec('UPDATE query_snapshots SET expires_at=0'); await page.locator('#more-results').click();
  await page.waitForFunction(() => document.getElementById('search-error')?.textContent?.startsWith('Este recorte expirou'));
  assert.equal(await page.locator('#search-results > li').count(), 50);
  await page.locator('#refresh-search').click(); await page.waitForFunction(() => document.getElementById('search-error')?.textContent === '' && document.getElementById('search-panel')?.getAttribute('aria-busy') !== 'true');
  for (const width of [320, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'sem overflow em ' + width);
    await page.screenshot({ path: 'dist/02-01-ui-' + width + '.png' });
  }
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; }); await page.setViewportSize({ width: 320, height: 900 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'reflow200%'); await page.screenshot({ path: 'dist/02-01-ui-zoom200.png' });
  assert.equal(await page.locator('#search-results script').count(), 0); assert.equal(await page.evaluate(() => (window as any).EXECUTED), undefined);
  assert.doesNotMatch(await page.locator('body').textContent(), /PRIVATE_SENTINEL/);
  await page.locator('#logout-button').click(); await page.locator('#login-panel').waitFor({ state: 'visible' });
  assert.equal(await page.locator('#search-results > li').count(), 0); assert.equal(await page.locator('#contact-candidates > li').count(), 0); assert.equal(await page.locator('#contact-query').inputValue(), '');
});

test('estado operacional mostra backup conferido atraso falha e coleta pausada sem expor detalhes privados', async t => {
  const { page, login } = await uiFixture(t);
  let backup: any = { result: 'success', lastVerifiedAt: '2026-10-13T12:00:00.000Z', overdue24h: false, host: 'PRIVATE_SENTINEL', path: 'PRIVATE_SENTINEL' };
  await page.route('**/api/status', (route: any) => route.fulfill({ status: 200, json: { connection: 'disconnected', collectorEnabled: false, pairingAvailable: false, media: null, coverage: null, backup } }));
  await login();
  assert.match(await page.locator('#backup-status').textContent(), /Última cópia conferida.*13\/10\/2026.*09:00:00.*America\/Sao_Paulo/);
  assert.match(await page.locator('#connection').textContent(), /Coleta pausada/); assert.doesNotMatch(await page.locator('#qr-status').textContent(), /preparação.*cópia recuperável/i);
  backup = { ...backup, result: 'failed', overdue24h: true, safeFailureCode: 'PRIVATE_SENTINEL' };
  await page.evaluate(() => dispatchEvent(new Event('online')));
  await page.waitForFunction(() => document.getElementById('backup-status')?.textContent?.includes('Falha na última tentativa'));
  assert.match(await page.locator('#backup-status').textContent(), /atrasada|mais de 24 horas/); assert.equal(await page.locator('#backup-status').getAttribute('role'), 'alert');
  assert.doesNotMatch(await page.locator('body').textContent(), /PRIVATE_SENTINEL/);
  backup = { result: 'pending', lastVerifiedAt: null, overdue24h: true }; await page.evaluate(() => dispatchEvent(new Event('online')));
  await page.waitForFunction(() => document.getElementById('backup-status')?.textContent?.includes('em andamento'));
  assert.match(await page.locator('#backup-status').textContent(), /Nenhuma cópia conferida/);
  for (const width of [320, 1280]) { await page.setViewportSize({ width, height: 900 }); assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true); }
});

test('login distingue recusa de acesso de senha incorreta', async t => {
  const { page, base } = await uiFixture(t); let status = 403;
  await page.route('**/login', (route: any) => route.fulfill({ status, json: { error: 'PRIVATE_SENTINEL' } }));
  await page.goto(base); await page.locator('#password').fill('senha sintética'); await page.locator('#login-button').click();
  await page.waitForFunction(() => document.getElementById('login-error')?.textContent);
  assert.match(await page.locator('#login-error').textContent(), /Recarregue/); assert.doesNotMatch(await page.locator('#login-error').textContent(), /senha|PRIVATE_SENTINEL/i);
  status = 401; await page.locator('#password').fill('senha sintética'); await page.locator('#login-button').click();
  await page.waitForFunction(() => document.getElementById('login-error')?.textContent?.includes('Confira a senha'));
});
