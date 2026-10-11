import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { Readable } from 'node:stream';
import { startMediaWorker } from '../src/media.js';
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
  await page.evaluate(() => window.scrollTo(0, 1600)); const scrollB = await page.evaluate(() => scrollY);
  await controls.nth(0).evaluate((el: any) => el.click()); await page.evaluate(() => window.scrollTo(0, 2200)); const scrollA = await page.evaluate(() => scrollY);
  await controls.nth(1).evaluate((el: any) => el.click()); assert.ok(Math.abs((await page.evaluate(() => scrollY)) - scrollB) < 2);
  await controls.nth(0).evaluate((el: any) => el.click()); assert.ok(Math.abs((await page.evaluate(() => scrollY)) - scrollA) < 2);
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
