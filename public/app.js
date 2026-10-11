const $ = id => document.getElementById(id);
const unknown = 'Não informado pela origem', expired = 'Sua sessão expirou. Entre novamente para acessar o acervo.';
const noServer = 'Sem acesso ao servidor. O conteúdo exibido pode estar desatualizado. Tente carregar novamente quando a conexão voltar.';
const date = value => value ? new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).format(new Date(value)).replace(',', '') : unknown;
let csrfToken, listCursor, messageCursor, selected, listPosition = 0, reading = false, authenticated = false;
let readVersion = 0, navigationVersion = 0, statusVersion = 0, qrTimer, lastReference, attemptsLimit;
let searchVersion = 0, searchCursor, searchFilters;
let contactVersion = 0, contactSelection, candidateCursor, candidateQuery;
const tabs = new Map();
const pendingContexts = new Map();
const previews = new Set();
let exportJob, exportTimer, exportVersion = 0, exportCreating = false;
function clearExport() { ++exportVersion; clearTimeout(exportTimer); exportJob = undefined; exportCreating = false; }
function exportView() {
  for (const tab of tabs.values()) {
    if (!tab.exportForm) continue;
    tab.exportSubmit.disabled = exportCreating || exportJob?.state === 'preparing';
    tab.exportForm.setAttribute('aria-busy', String(exportCreating || exportJob?.state === 'preparing'));
    const box = tab.exportFeedback; box.replaceChildren();
    if (!exportJob) continue;
    const f = exportJob.effectiveFilters;
    addText(box, 'p', 'Recorte congelado: ' + conversationLabel(exportJob.conversation) + '; ' + (f.from ?? 'início aberto') + ' até ' + (f.to ?? 'fim aberto') + '; ' + f.zone).dir = 'auto';
    addText(box, 'p', 'UTC: ' + (f.startUtc ?? 'início aberto') + ' até ' + (f.endUtc ?? 'fim aberto') + ' (exclusivo).');
    const status = addText(box, 'p', exportJob.state === 'preparing' ? 'Preparando exportação… Você pode continuar lendo.' : exportJob.state === 'ready' ? 'Exportação pronta e conferida.' : exportJob.reason ?? 'Não foi possível preparar a exportação. Gere novamente.'); status.setAttribute('role', 'status');
    if (exportJob.state === 'ready') {
      addText(box, 'p', exportJob.counts.messages + ' mensagens · ' + exportJob.counts.files + ' arquivos · ' + exportJob.counts.missing + ' faltantes. Cobertura observada; não garante histórico integral.');
      const link = addText(box, 'a', 'Baixar ZIP', 'download'); link.href = exportJob.downloadURL; link.download = '';
      link.addEventListener('click', async e => { e.preventDefault(); const version = readVersion, ticket = exportVersion, job = exportJob; try { const r = await request(job.downloadURL, { method: 'HEAD' }); if (version !== readVersion || ticket !== exportVersion || !authenticated || suspended) return; if (!r.ok) { status.textContent = r.status === 410 ? 'Esta exportação expirou. Gere novamente.' : 'Download indisponível. Tente conferir novamente.'; return; } const native = document.createElement('a'); native.href = job.downloadURL; native.download = ''; native.click(); status.textContent = 'Download solicitado ao navegador.'; } catch (e) { if (version === readVersion && !['stale', 'expired'].includes(e.message)) status.textContent = 'Não foi possível solicitar o download.'; } });
    }
    if (exportJob.pollError) { const alert = addText(box, 'p', 'Não foi possível conferir a exportação. O último estado foi conservado.'); alert.setAttribute('role', 'alert'); const retry = addText(box, 'button', 'Tentar conferir novamente'); retry.type = 'button'; retry.addEventListener('click', () => pollExport()); }
  }
}
async function pollExport() {
  clearTimeout(exportTimer); const version = readVersion, ticket = ++exportVersion, job = exportJob; if (!job || !authenticated || suspended) return;
  try { const r = await request('/api/exports/' + encodeURIComponent(job.jobId)); const data = await r.json(); if (version !== readVersion || ticket !== exportVersion || !authenticated || suspended) return; if (!r.ok) { exportJob = { ...job, state: r.status === 410 ? 'expired' : job.state, reason: data.error, pollError: true }; } else exportJob = data; exportView(); if (r.ok && data.state === 'preparing') exportTimer = setTimeout(pollExport, 1000); }
  catch (e) { if (version === readVersion && ticket === exportVersion && !['stale', 'expired'].includes(e.message)) { exportJob = { ...job, pollError: true }; exportView(); } }
}
function exportForm(tab) {
  const form = addText(tab.panel, 'form', '', 'export-form'); form.noValidate = true;
  addText(form, 'h3', 'Exportar recorte'); addText(form, 'p', 'Conversa fixa: ' + conversationLabel(tab.conversation)).dir = 'auto';
  const inputs = ['De', 'Até'].map((label, i) => { const id = 'export-' + tab.conversation.id + '-' + i; const l = addText(form, 'label', label); l.htmlFor = id; const input = addText(form, 'input', ''); input.id = id; input.type = 'date'; input.setAttribute('aria-describedby', 'export-help'); return input; });
  const submit = addText(form, 'button', 'Preparar exportação'); submit.type = 'submit';
  const period = addText(form, 'p', '', 'export-period'); period.setAttribute('role', 'status');
  let periodVersion = 0;
  async function previewPeriod() {
    const version = readVersion, ticket = ++periodVersion, query = new URLSearchParams({ from: inputs[0].value, to: inputs[1].value });
    period.textContent = 'Conferindo período…';
    try { const r = await request('/api/exports/period?' + query), f = await r.json(); if (version !== readVersion || ticket !== periodVersion || !authenticated || suspended || !form.isConnected) return; period.textContent = r.ok ? (f.from ?? 'Início aberto') + ' até ' + (f.to ?? 'fim aberto') + '; ' + f.zone + '; UTC: ' + (f.startUtc ?? 'início aberto') + ' até ' + (f.endUtc ?? 'fim aberto') + ' (exclusivo). ' + f.dateUnknownPolicy : f.error; }
    catch (e) { if (version === readVersion && ticket === periodVersion && !['stale', 'expired'].includes(e.message)) period.textContent = 'Não foi possível conferir o período. Tente ajustar as datas novamente.'; }
  }
  inputs.forEach(input => input.addEventListener('input', previewPeriod)); previewPeriod();
  const feedback = addText(form, 'p', ''); feedback.setAttribute('role', 'alert'); const job = addText(tab.panel, 'section', '');
  Object.assign(tab, { exportForm: form, exportSubmit: submit, exportFeedback: job }); exportView();
  form.addEventListener('submit', async e => {
    e.preventDefault(); if (!authenticated || suspended || submit.disabled) return;
    const from = inputs[0].value, to = inputs[1].value; feedback.textContent = ''; inputs.forEach(i => i.removeAttribute('aria-invalid'));
    if (from && to && from > to) { feedback.textContent = 'Confira as datas. A data inicial deve ser igual ou anterior à final.'; inputs[0].setAttribute('aria-invalid', 'true'); inputs[0].focus(); return; }
    const version = readVersion, ticket = ++exportVersion; exportCreating = true; exportView(); feedback.textContent = 'Solicitando preparação…';
    try { const r = await request('/api/exports', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ conversationId: tab.conversation.id, from, to, csrfToken }) }); const data = await r.json(); if (version !== readVersion || ticket !== exportVersion || !authenticated || suspended) return; feedback.textContent = ''; if (!r.ok) { feedback.textContent = data.error ?? 'Não foi possível iniciar a exportação.'; if ([400, 422].includes(r.status)) { inputs[0].setAttribute('aria-invalid', 'true'); inputs[0].focus(); } return; } exportJob = data; exportView(); pollExport(); }
    catch (e) { if (version === readVersion && !['stale', 'expired'].includes(e.message)) feedback.textContent = 'Não foi possível iniciar a exportação. Tente novamente.'; }
    finally { if (version === readVersion) { exportCreating = false; exportView(); } }
  });
}
function closePreviews(root = document) { for (const preview of [...previews]) if (root.contains(preview.block)) preview.close(false); }
let suspended = false;
const searchPanel = $('search-panel'), searchForm = $('search-form'), termInput = $('search-terms'), searchButton = $('search-submit');
const searchStatus = $('search-status'), searchError = $('search-error'), searchScope = $('search-scope'), searchResults = $('search-results');
const moreResults = $('more-results'), refreshSearch = $('refresh-search');
const conversationLabel = c => (c.name ?? 'Conversa sem nome recebido') + ' · ' + (c.identity ?? unknown) + ' · ' + c.id;
async function locateContacts(append = false) {
  if (!authenticated || $('candidate-panel').getAttribute('aria-busy') === 'true') return;
  const version = readVersion, ticket = ++contactVersion;
  if (!append) candidateQuery = $('contact-query').value.trim();
  const query = new URLSearchParams({ q: candidateQuery }); if (append && candidateCursor) query.set('cursor', candidateCursor);
  $('candidate-panel').setAttribute('aria-busy', 'true'); $('locate-contact').disabled = $('more-candidates').disabled = true; $('candidate-status').textContent = 'Localizando conversas…'; $('contact-error').textContent = '';
  try {
    const response = await request('/api/conversations?' + query); if (!response.ok) throw Error('server'); const data = await response.json();
    if (version !== readVersion || ticket !== contactVersion || !authenticated) return;
    if (!append) $('contact-candidates').replaceChildren();
    for (const c of data.conversations) {
      const li = document.createElement('li');
      addText(li, 'p', conversationLabel(c) + ' · ' + (c.kind === 'group' ? 'Grupo' : c.kind === 'individual' ? 'Individual' : unknown)).dir = 'auto';
      detail(li, 'Última data — America/Sao_Paulo', date(c.lastTimestamp));
      const choose = addText(li, 'button', 'Usar na busca'); choose.type = 'button';
      choose.addEventListener('click', () => { contactSelection = c; $('contact-query').value = c.name ?? c.identity ?? c.id; $('contact-selection').textContent = 'Conversa: ' + conversationLabel(c); $('contact-error').textContent = ''; $('contact-query').removeAttribute('aria-invalid'); searchButton.focus(); });
      $('contact-candidates').append(li);
    }
    candidateCursor = data.nextCursor; $('more-candidates').hidden = !candidateCursor;
    const n = $('contact-candidates').children.length; $('candidate-status').textContent = n ? n + (n === 1 ? ' conversa localizada' : ' conversas localizadas') : 'Não encontrado no acervo. Confira o nome ou a identidade.';
  } catch (error) { if (version === readVersion && ticket === contactVersion && !['stale', 'expired'].includes(error.message)) { $('contact-error').textContent = 'Não foi possível localizar conversas. Tente localizar novamente.'; $('candidate-status').textContent = $('contact-candidates').children.length ? 'O conteúdo exibido pode estar desatualizado.' : ''; } }
  finally { if (version === readVersion && ticket === contactVersion) { $('candidate-panel').removeAttribute('aria-busy'); $('locate-contact').disabled = $('more-candidates').disabled = false; } }
}
$('contact-query').addEventListener('input', () => { ++contactVersion; contactSelection = candidateCursor = undefined; $('contact-selection').textContent = 'Todo o acervo'; $('contact-candidates').replaceChildren(); $('more-candidates').hidden = true; $('candidate-panel').removeAttribute('aria-busy'); $('locate-contact').disabled = $('more-candidates').disabled = false; });
$('locate-contact').addEventListener('click', () => locateContacts()); $('more-candidates').addEventListener('click', () => locateContacts(true));
$('all-archive').addEventListener('click', () => { ++contactVersion; contactSelection = candidateCursor = undefined; $('contact-query').value = ''; $('contact-query').removeAttribute('aria-invalid'); $('contact-selection').textContent = 'Todo o acervo'; $('contact-error').textContent = $('candidate-status').textContent = ''; $('contact-candidates').replaceChildren(); $('more-candidates').hidden = true; $('candidate-panel').removeAttribute('aria-busy'); $('locate-contact').disabled = $('more-candidates').disabled = false; });
async function search(append = false) {
  if (!authenticated || searchPanel.getAttribute('aria-busy') === 'true') return;
  const version = readVersion, ticket = ++searchVersion;
  if (!append) {
    for (const id of ['contact-query', 'search-terms', 'search-from', 'search-to']) $(id).removeAttribute('aria-invalid');
    if ($('contact-query').value.trim() && !contactSelection) { $('contact-error').textContent = 'Escolha uma conversa da lista ou limpe o campo para buscar em todo o acervo.'; $('contact-query').setAttribute('aria-invalid', 'true'); $('contact-query').focus(); return; }
    const tokens = termInput.value.normalize('NFC').match(/[\p{L}\p{N}\p{M}]+/gu) ?? [];
    if ([...termInput.value].length > 2000 || tokens.length > 25 || termInput.value.trim() && !tokens.length) { searchError.textContent = 'Use até 2000 caracteres e 25 termos simples.'; termInput.setAttribute('aria-invalid', 'true'); termInput.focus(); return; }
    const from = $('search-from').value, to = $('search-to').value;
    if (from && to && from > to || [from, to].some(v => v && (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(v) || v.startsWith('0000-')))) { searchError.textContent = 'Confira as datas. A data inicial deve ser igual ou anterior à final.'; $('search-from').setAttribute('aria-invalid', 'true'); $('search-from').focus(); return; }
    searchFilters = new URLSearchParams({ q: termInput.value, from, to }); if (contactSelection) searchFilters.set('conversationId', contactSelection.id);
  }
  const query = new URLSearchParams(searchFilters); if (append && searchCursor) query.set('cursor', searchCursor);
  searchPanel.setAttribute('aria-busy', 'true'); searchButton.disabled = moreResults.disabled = refreshSearch.disabled = true; searchStatus.textContent = 'Buscando mensagens…'; searchError.textContent = '';
  try {
    const response = await request('/api/search?' + query);
    if (version !== readVersion || ticket !== searchVersion) return;
    const data = await response.json(); if (version !== readVersion || ticket !== searchVersion) return;
    if (!response.ok) { searchError.textContent = response.status === 410 ? 'Este recorte expirou. Atualize a busca para criar um novo recorte.' : [413, 429].includes(response.status) ? data.error : response.status === 404 ? 'Não encontrado no acervo. Confira o contato e busque novamente.' : 'Não foi possível buscar mensagens. Tente buscar novamente.'; searchStatus.textContent = searchResults.children.length ? 'O conteúdo exibido pode estar desatualizado.' : ''; refreshSearch.hidden = false; return; }
    if (!append) { closePreviews(searchResults); searchResults.replaceChildren(); }
    for (const message of data.messages) {
      const li = messageItem(message), article = li.querySelector('article');
      addText(article, 'p', 'Conversa: ' + (message.conversation?.name ?? unknown) + ' · ' + (message.conversation?.identity ?? unknown) + ' · ' + message.conversationId, 'meta').dir = 'auto';
      for (const revision of message.matchingRevisions) {
        addText(article, 'p', revision.historical ? 'Correspondência em conteúdo anteriormente capturado — registro histórico' : 'Correspondência no conteúdo atual');
        addText(article, 'p', revision.text ?? unknown).dir = 'auto'; detail(article, 'Revisão correspondente', revision.revisionId);
      }
      const open = addText(article, 'button', 'Abrir contexto'); open.dataset.reference = message.reference;
      open.addEventListener('click', () => { listPosition = window.scrollY; openContext(message.reference, data.snapshotId, message.conversationId); });
      searchResults.append(li);
    }
    searchCursor = data.nextCursor; moreResults.hidden = !searchCursor; refreshSearch.hidden = false;
    const n = searchResults.children.length;
    searchStatus.textContent = n ? n + (n === 1 ? ' resultado carregado' : ' resultados carregados') + (searchCursor ? '' : '. Todos os resultados deste recorte foram carregados.') : '';
    $('search-empty').hidden = n !== 0;
    const filters = data.effectiveFilters, c = data.messages[0]?.conversation;
    searchScope.textContent = (filters.conversationId ? 'Conversa: ' + (c ? conversationLabel(c) : filters.conversationId) : 'Todo o acervo') + '; período: ' + (filters.from ?? 'início aberto') + ' até ' + (filters.to ?? 'fim aberto') + '; fuso: ' + filters.zone + '; termos: ' + (filters.terms.join(' · ') || 'sem termos');
    $('search-utc').hidden = false; $('search-limits').replaceChildren();
    detail($('search-limits'), 'Início inclusivo UTC', filters.startUtc ?? 'Aberto'); detail($('search-limits'), 'Fim exclusivo UTC', filters.endUtc ?? 'Aberto'); addText($('search-limits'), 'p', filters.dateUnknownPolicy);
  } catch (error) { if (version === readVersion && ticket === searchVersion && !['stale', 'expired'].includes(error.message)) { searchError.textContent = 'Não foi possível buscar mensagens. Tente buscar novamente.'; searchStatus.textContent = searchResults.children.length ? 'O conteúdo exibido pode estar desatualizado.' : ''; } }
  finally { if (version === readVersion && ticket === searchVersion) { searchPanel.removeAttribute('aria-busy'); searchButton.disabled = moreResults.disabled = refreshSearch.disabled = false; } }
}
searchForm.addEventListener('submit', e => { e.preventDefault(); search(); }); moreResults.addEventListener('click', () => search(true)); refreshSearch.addEventListener('click', () => search());
function hideQr() { clearTimeout(qrTimer); $('qr')?.remove(); $('qr-instruction').hidden = true; }
function signedOut(message = '') {
  clearExport();
  closePreviews();
  ++readVersion; ++navigationVersion; ++statusVersion; ++searchVersion;
  ++contactVersion; contactSelection = candidateCursor = candidateQuery = undefined; $('contact-candidates').replaceChildren(); $('candidate-status').textContent = $('contact-error').textContent = ''; $('contact-selection').textContent = 'Todo o acervo'; $('more-candidates').hidden = true; $('candidate-panel').removeAttribute('aria-busy'); $('locate-contact').disabled = $('more-candidates').disabled = false;
  searchResults.replaceChildren(); searchForm.reset(); searchCursor = searchFilters = undefined; searchError.textContent = ''; searchStatus.textContent = 'Combine conversa, termos e período e selecione Buscar mensagens. Campos vazios buscam todo o acervo.'; searchScope.textContent = 'Todo o acervo'; moreResults.hidden = refreshSearch.hidden = true; $('search-empty').hidden = $('search-utc').hidden = true; $('search-limits').replaceChildren(); searchPanel.removeAttribute('aria-busy'); searchButton.disabled = moreResults.disabled = refreshSearch.disabled = false;
  for (const id of ['contact-query', 'search-terms', 'search-from', 'search-to']) $(id).removeAttribute('aria-invalid');
  authenticated = reading = false; selected = listCursor = messageCursor = csrfToken = lastReference = attemptsLimit = undefined;
  hideQr();
  $('archive').hidden = true; $('archive').classList.remove('reading'); $('login-panel').hidden = false;
  pendingContexts.clear(); suspended = false;
  for (const tab of tabs.values()) { ++tab.generation; releasePanel(tab.panel); tab.panel.remove(); tab.button.parentElement.remove(); } tabs.clear();
  for (const id of ['conversations', 'coverage', 'coverage-batches']) $(id).replaceChildren();
  resetReader();
  for (const id of ['connection', 'qr-status', 'media-status', 'archive-error', 'list-status', 'status-loading']) $(id).textContent = '';
  for (const id of ['pairing', 'back', 'more-conversations', 'more-messages', 'refresh-conversation', 'retry', 'empty-list']) $(id).hidden = true;
  for (const id of ['reader', 'conversation-panel']) $(id).removeAttribute('aria-busy');
  $('message-title').textContent = 'Mensagens arquivadas'; $('reader-status').textContent = 'Abra uma conversa ou um resultado para ler o contexto.';
  $('login-error').textContent = message; $('password').value = ''; history.replaceState({}, '', '/'); $('password').focus();
}
async function request(path, options) {
  const version = readVersion, response = await fetch(path, { cache: 'no-store', ...options });
  if (version !== readVersion) throw Error('stale');
  if (response.status === 401 && path !== '/login') { signedOut(expired); throw Error('expired'); }
  return response;
}
async function challenge() {
  const version = readVersion, response = await request('/api/session'); if (!response.ok) throw Error('server');
  const data = await response.json(); if (version !== readVersion) throw Error('stale'); csrfToken = data.csrfToken; return data;
}
function failure(error) {
  if (['expired', 'stale'].includes(error?.message) || !authenticated) return;
  hideQr(); $('qr-status').textContent = 'Aguardando um QR válido…';
  $('archive-error').textContent = error instanceof TypeError ? noServer : 'Não foi possível carregar o acervo. Tente carregar novamente.'; $('retry').hidden = false;
}
function addText(parent, tag, text, className) {
  const el = document.createElement(tag); el.textContent = text; if (className) el.className = className; parent.append(el); return el;
}
function detail(parent, label, value) { addText(parent, 'p', label + ': ' + (value ?? unknown)); }
function evidence(article, message) {
  const details = document.createElement('details'); article.append(details); addText(details, 'summary', 'Detalhes da evidência');
  detail(details, 'Instante original UTC', message.originalTimestamp);
  for (const origin of message.origins ?? []) for (const [label, key] of [['ID da origem', 'id'], ['Conversa da origem', 'remoteJid'], ['Participante da origem', 'participant'], ['Identidade alternativa da conversa', 'remoteJidAlt'], ['Identidade alternativa do participante', 'participantAlt']]) detail(details, label, origin[key]);
  if (!message.origins?.length) detail(details, 'Chave da origem', null);
  for (const mapping of message.identityMappings ?? []) detail(details, 'Mapeamento recebido PN/LID', mapping.jid + ' ↔ ' + mapping.alternate);
  if (message.expirationSeconds != null) detail(details, 'Expiração recebida em segundos', message.expirationSeconds);
  if (message.revisions?.length) {
    const history = document.createElement('details'); article.append(history); addText(history, 'summary', 'Ver histórico recebido');
    for (const revision of message.revisions) {
      addText(history, 'p', 'Conteúdo anteriormente capturado — registro histórico'); detail(history, 'Registro', revision.kind);
      detail(history, 'Observado em America/Sao_Paulo', date(revision.observedAt)); detail(history, 'Observado em UTC', revision.observedAt); detail(history, 'Instante da alteração recebido da origem', revision.sourceTimestamp);
      addText(history, 'p', message.restricted || revision.restricted ? 'Visualização única — conteúdo indisponível; somente metadados recebidos.' : revision.text ?? unknown).dir = 'auto';
    }
  }
}
function attachmentBlock(article, attachment) {
  const block = document.createElement('section'); block.className = 'attachment'; article.append(block);
  addText(block, 'h3', attachment.name ?? 'Nome original não informado').dir = 'auto'; detail(block, 'Tipo recebido', attachment.type); detail(block, 'MIME recebido', attachment.mimeType); detail(block, 'Tamanho local em bytes', attachment.size);
  detail(block, 'SHA-256 local', attachment.sha256); detail(block, 'Hash de origem', attachment.sourceHashVerified ? 'Conferido com o original preservado' : attachment.state === 'available' ? 'Não informado pela origem' : 'Comparação ainda não confirmada');
  const reason = attachment.reason ?? unknown;
  const state = attachment.state === 'available' ? 'Disponível — arquivo finalizado e verificado.' : attachment.state === 'downloading' ? 'Pendente — download em andamento.' : attachment.state === 'pending' ? 'Pendente — o original ainda não foi preservado.' : attachment.state === 'retry_wait' ? 'Falha recuperável — ' + reason + '. Tentativas: ' + attachment.attempts + '/' + (attemptsLimit ?? unknown) + '.' : 'Indisponível — ' + reason + '. A mensagem permanece no acervo.';
  addText(block, 'p', state); if (attachment.state !== 'available') return;
  const link = addText(block, 'a', 'Baixar original', 'download'); link.href = '/api/attachments/' + encodeURIComponent(attachment.id); link.download = attachment.name ?? 'original';
  const status = addText(block, 'p', '', 'meta'); status.setAttribute('role', 'status');
  const mime = attachment.mimeType?.split(';')[0].trim().toLowerCase();
  const kind = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(mime) ? 'img' : ['audio/wav', 'audio/wave', 'audio/x-wav', 'audio/mpeg', 'audio/ogg', 'audio/flac', 'audio/x-flac'].includes(mime) ? 'audio' : ['video/mp4', 'video/webm'].includes(mime) ? 'video' : null;
  if (!kind) addText(block, 'p', 'Sem visualização integrada para este formato. Baixe o original para abrir em outro aplicativo.');
  else {
    const open = addText(block, 'button', kind === 'img' ? 'Visualizar imagem' : kind === 'audio' ? 'Ouvir áudio' : 'Assistir vídeo'); open.type = 'button';
    let ticket = 0, preview;
    const close = (focus = true) => { ++ticket; if (preview) { previews.delete(preview); preview.listeners.abort(); for (const media of preview.box.querySelectorAll('[src]')) { media.pause?.(); media.removeAttribute('src'); media.load?.(); } preview.box.remove(); preview = undefined; } open.disabled = false; if (focus && block.isConnected) open.focus({ preventScroll: true }); };
    open.addEventListener('click', async () => {
      if (preview || !authenticated) return;
      const version = readVersion, current = ++ticket;
      const box = addText(block, 'div', '', 'preview'), feedback = addText(box, 'p', 'Carregando visualização…'); feedback.setAttribute('role', 'status'); box.setAttribute('aria-busy', 'true');
      const hide = addText(box, 'button', 'Fechar visualização'); hide.type = 'button'; hide.addEventListener('click', () => close());
      const listeners = new AbortController(); preview = { block, box, close, listeners }; previews.add(preview); open.disabled = true;
      const valid = () => version === readVersion && current === ticket && authenticated && !suspended && block.isConnected;
      try {
        const path = '/api/attachments/' + encodeURIComponent(attachment.id) + '/preview', response = await request(path, { method: 'HEAD' });
        if (!valid()) return;
        if (!response.ok) { feedback.textContent = response.status === 404 ? 'Original disponível não encontrado no acervo. A mensagem permanece no acervo.' : response.status === 415 ? 'Sem visualização integrada para este formato. Baixe o original para abrir em outro aplicativo.' : 'Não foi possível visualizar este formato. Baixe o original para abrir em outro aplicativo.'; box.removeAttribute('aria-busy'); return; }
        const media = document.createElement(kind);
        if (kind === 'img') media.alt = attachment.name ?? 'Nome original não informado';
        else { media.controls = true; media.preload = 'none'; media.setAttribute('aria-label', attachment.name ?? 'Nome original não informado'); feedback.textContent = 'Use os controles para ' + (kind === 'audio' ? 'ouvir o áudio.' : 'assistir ao vídeo.'); box.removeAttribute('aria-busy'); }
        media.addEventListener(kind === 'img' ? 'load' : 'loadeddata', () => { if (valid()) { feedback.textContent = ''; box.removeAttribute('aria-busy'); } }, { signal: listeners.signal });
        media.addEventListener('error', async () => {
          if (!valid()) return;
          feedback.textContent = 'Não foi possível visualizar este formato. Baixe o original para abrir em outro aplicativo.'; feedback.setAttribute('role', 'alert'); box.removeAttribute('aria-busy'); media.pause?.();
          try { const previous = csrfToken, session = await challenge(); if (valid() && (!session.authenticated || previous !== csrfToken)) signedOut(expired); } catch (error) { if (valid()) failure(error); }
        }, { once: true, signal: listeners.signal });
        box.insertBefore(media, hide); media.src = path;
      } catch (error) { if (valid() && !['expired', 'stale'].includes(error.message)) { feedback.textContent = 'Não foi possível visualizar este formato. Baixe o original para abrir em outro aplicativo.'; box.removeAttribute('aria-busy'); } }
    });
  }
  link.addEventListener('click', async event => {
    event.preventDefault(); if (link.getAttribute('aria-busy') === 'true') return;
    const version = readVersion, navigation = navigationVersion; link.setAttribute('aria-busy', 'true'); status.textContent = 'Carregando original…';
    try {
      const response = await request(link.getAttribute('href'), { method: 'HEAD' }); if (!response.ok) throw Error('download');
      if (version !== readVersion || navigation !== navigationVersion || !authenticated || suspended || !block.isConnected) return;
      const save = document.createElement('a'); save.href = link.href; save.download = ''; document.body.append(save); save.click(); save.remove();
      status.textContent = 'Download solicitado ao navegador. Confira a conclusão nos downloads.';
    } catch (error) { if (version === readVersion && !['expired', 'stale'].includes(error.message)) { status.textContent = 'Não foi possível baixar o original. Confira o estado do anexo e tente novamente se ele estiver disponível.'; if (error instanceof TypeError) failure(error); } }
    finally { link.removeAttribute('aria-busy'); }
  });
}
function messageItem(message) {
  const li = document.createElement('li'), article = document.createElement('article'); li.append(article); li.dataset.reference = message.reference;
  const header = document.createElement('header'); article.append(header);
  addText(header, 'p', (message.author ?? 'Autor não informado pela origem') + ' · ' + (message.fromMe === true ? 'Enviada por você' : message.fromMe === false ? 'Recebida' : 'Direção não informada pela origem'), 'meta');
  const time = addText(header, 'time', date(message.originalTimestamp), 'meta'); if (message.originalTimestamp) time.dateTime = message.originalTimestamp;
  if (message.orderUncertain) addText(article, 'p', 'Ordem das alterações incerta; os registros recebidos foram preservados.');
  const change = [...message.revisions ?? []].reverse().find(r => r.kind === (message.revoked ? 'revoke' : 'edit'));
  if (change) addText(article, 'p', (message.revoked ? 'Revogada no WhatsApp; revogação observada em ' : 'Editada; alteração observada em ') + date(change.observedAt) + '.');
  addText(article, 'p', message.restricted ? 'Visualização única — conteúdo indisponível; somente metadados recebidos.' : message.revoked ? 'Conteúdo atual revogado. Confira o histórico recebido.' : message.text ?? unknown).dir = 'auto';
  addText(article, 'p', 'Referência: ' + message.reference + ' · Tipo: ' + (message.type ?? unknown), 'meta');
  if (message.type === 'unknown') addText(article, 'p', 'Tipo não reconhecido; conteúdo disponível limitado aos campos recebidos.');
  if (message.expirationSeconds != null) addText(article, 'p', 'Mensagem temporária; conteúdo capturado enquanto disponível.');
  if (message.quote) {
    const quote = addText(article, 'blockquote', message.quote.restricted ? 'Visualização única — conteúdo indisponível; somente metadados recebidos.' : message.quote.text ?? unknown); quote.dir = 'auto';
    detail(quote, 'Autor recebido', message.quote.author); detail(quote, 'Referência recebida', message.quote.id); addText(quote, 'p', 'Citação recebida; original ainda não relacionado/conferido.');
  }
  for (const attachment of message.attachments ?? []) if (attachment) attachmentBlock(article, attachment);
  evidence(article, message); return li;
}
async function list(append = false) {
  if ($('conversation-panel').getAttribute('aria-busy') === 'true') return;
  const version = readVersion; $('list-status').textContent = 'Carregando conversas…'; $('conversation-panel').setAttribute('aria-busy', 'true'); $('more-conversations').disabled = true;
  try {
    const response = await request('/api/conversations' + (append && listCursor ? '?cursor=' + encodeURIComponent(listCursor) : ''));
    if (!response.ok) throw Error('server'); const data = await response.json(); if (version !== readVersion || !authenticated) return;
    if (!append) $('conversations').replaceChildren();
    for (const conversation of data.conversations) {
      const li = document.createElement('li'), link = addText(li, 'a', conversation.name ?? 'Conversa sem nome recebido');
      link.href = '/?conversation=' + encodeURIComponent(conversation.id); link.dataset.id = conversation.id;
      for (const [label, value] of [['Tipo', conversation.kind === 'group' ? 'Grupo' : conversation.kind === 'individual' ? 'Individual' : unknown], ['Identidade recebida', conversation.identity ?? unknown], ['Referência', conversation.id], ['Última data', date(conversation.lastTimestamp)]]) addText(link, 'span', label + ': ' + value, 'meta');
      if (conversation.id === selected) link.setAttribute('aria-current', 'page');
      link.addEventListener('click', event => { event.preventDefault(); listPosition = window.scrollY; history.pushState({}, '', link.href); openConversation(conversation.id); }); $('conversations').append(li);
    }
    listCursor = data.nextCursor; $('more-conversations').hidden = !listCursor; $('empty-list').hidden = $('conversations').children.length !== 0; $('list-status').textContent = '';
  } catch (error) { if (version === readVersion) failure(error); }
  finally { if (version === readVersion) { $('conversation-panel').removeAttribute('aria-busy'); $('more-conversations').disabled = false; } }
}
const readerIds = ['reader-status', 'messages', 'more-messages', 'more-after', 'refresh-conversation'];
function resetReader() {
  for (const id of readerIds) $(id)?.remove();
  addText($('reader'), 'p', 'Abra uma conversa ou um resultado para ler o contexto.', 'reader-empty').id = 'reader-status';
  for (const id of readerIds.slice(1)) { const el = addText($('reader'), id === 'messages' ? 'ol' : 'button', ''); el.id = id; el.hidden = true; }
}
function createTab(conversation) {
  if (!tabs.size) for (const id of readerIds) $(id)?.remove();
  const panel = document.createElement('section'); panel.id = 'panel-' + conversation.id; panel.hidden = true; panel.tabIndex = 0; panel.setAttribute('role', 'tabpanel'); panel.setAttribute('aria-labelledby', 'tab-' + conversation.id); $('conversation-panels').append(panel);
  const holder = document.createElement('div'); holder.setAttribute('role', 'presentation'); $('conversation-tabs').append(holder);
  const button = addText(holder, 'button', conversationLabel(conversation)); button.id = 'tab-' + conversation.id; button.setAttribute('role', 'tab'); button.setAttribute('aria-controls', panel.id); button.setAttribute('aria-selected', 'false'); button.tabIndex = -1;
  const close = addText(holder, 'button', 'Fechar'); close.setAttribute('aria-label', 'Fechar conversa: ' + conversationLabel(conversation));
  const status = addText(panel, 'p', ''); status.setAttribute('role', 'status');
  const messages = addText(panel, 'ol', '');
  const before = addText(panel, 'button', 'Carregar mensagens anteriores'), after = addText(panel, 'button', 'Carregar mensagens posteriores'), refresh = addText(panel, 'button', 'Atualizar conversa'); before.hidden = after.hidden = refresh.hidden = true;
  const tab = { conversation, panel, button, status, messages, before, after, refresh, generation: 0, loading: false, scroll: 0, anchor: null };
  tabs.set(conversation.id, tab); button.addEventListener('click', () => activateTab(tab)); before.addEventListener('click', () => contextPage(tab, 'before')); after.addEventListener('click', () => contextPage(tab, 'after')); refresh.addEventListener('click', () => openContext(tab.requestedReference, undefined, conversation.id));
  exportForm(tab);
  close.addEventListener('click', () => closeTab(tab));
  button.dir = 'auto';
  button.addEventListener('focus', () => { for (const other of tabs.values()) other.button.tabIndex = other === tab ? 0 : -1; });
  button.addEventListener('keydown', event => {
    const order = [...tabs.values()], index = order.indexOf(tab);
    if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
      event.preventDefault(); const target = event.key === 'Home' ? 0 : event.key === 'End' ? order.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + order.length) % order.length; order[target].button.focus({ preventScroll: true }); order[target].button.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    } else if (['Enter', ' '].includes(event.key)) { event.preventDefault(); activateTab(tab); }
    else if (event.key === 'Delete') { event.preventDefault(); closeTab(tab); }
  });
  return tab;
}
function activateTab(tab, restore = true) {
  ++navigationVersion;
  const previous = tabs.get(selected); if (previous && !previous.panel.hidden) previous.scroll = window.scrollY;
  for (const other of tabs.values()) {
    if (other !== tab) closePreviews(other.panel);
    other.panel.hidden = other !== tab; other.button.setAttribute('aria-selected', String(other === tab)); other.button.tabIndex = other === tab ? 0 : -1;
    for (const el of [other.status, other.messages, other.before, other.after, other.refresh]) el.removeAttribute('id');
  }
  [tab.status, tab.messages, tab.before, tab.after, tab.refresh].forEach((el, i) => el.id = readerIds[i]);
  selected = tab.conversation.id; lastReference = tab.lastReference; reading = tab.loading;
  $('reader').setAttribute('aria-busy', String(tab.loading)); $('message-title').textContent = tab.conversation.name ?? 'Conversa sem nome recebido'; $('archive').classList.add('reading'); $('back').hidden = false;
  for (const link of $('conversations').querySelectorAll('a')) { if (link.dataset.id === selected) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current'); }
  history.replaceState({}, '', '/?conversation=' + encodeURIComponent(selected) + (tab.anchor ? '&reference=' + encodeURIComponent(tab.anchor) : ''));
  if (restore) window.scrollTo(0, tab.scroll);
}
function releasePanel(panel) {
  closePreviews(panel);
  for (const el of panel.querySelectorAll('audio,video,img,[src]')) { el.pause?.(); el.removeAttribute('src'); el.load?.(); }
}
function closeTab(tab) {
  const order = [...tabs.values()], index = order.indexOf(tab), active = selected === tab.conversation.id || tab.button.parentElement.contains(document.activeElement);
  ++tab.generation; pendingContexts.delete(tab.conversation.id); tabs.delete(tab.conversation.id); releasePanel(tab.panel); tab.panel.remove(); tab.button.parentElement.remove();
  if (active) {
    const next = order[index + 1] ?? order[index - 1];
    if (next) { activateTab(next); next.button.focus({ preventScroll: true }); }
    else { ++navigationVersion; selected = lastReference = undefined; reading = false; resetReader(); $('reader').removeAttribute('aria-busy'); $('message-title').textContent = 'Mensagens arquivadas'; back(); $('conversations').querySelector('a')?.focus({ preventScroll: true }); }
  }
}
function renderContext(tab, data, direction) {
  const anchor = direction ? tab.messages.querySelector('[data-anchor=true]') ?? tab.messages.firstElementChild : null, offset = anchor?.getBoundingClientRect().top;
  if (!direction) { releasePanel(tab.panel); tab.messages.replaceChildren(); tab.references = new Set(); tab.snapshotId = data.snapshotId; tab.anchor = data.anchorReference; tab.requestedReference = data.requestedReference; tab.matchedEvidence = data.matchedEvidence; }
  const fragment = document.createDocumentFragment();
  for (const message of data.messages) {
    if (tab.references.has(message.reference)) continue; tab.references.add(message.reference);
    const li = messageItem(message);
    if (message.reference === tab.anchor) {
      li.dataset.anchor = 'true'; li.tabIndex = -1; addText(li.querySelector('article'), 'p', 'Mensagem localizada');
      for (const revision of tab.matchedEvidence) { addText(li.querySelector('article'), 'p', revision.historical ? 'Correspondência em conteúdo anteriormente capturado — registro histórico' : 'Correspondência no conteúdo atual'); addText(li.querySelector('article'), 'p', revision.text ?? unknown).dir = 'auto'; detail(li.querySelector('article'), 'Revisão correspondente', revision.revisionId); }
    }
    fragment.append(li);
  }
  if (direction === 'before') tab.messages.prepend(fragment); else tab.messages.append(fragment);
  if (direction !== 'after') tab.previousCursor = data.previousCursor;
  if (direction !== 'before') tab.nextCursor = data.nextCursor;
  tab.before.hidden = !tab.previousCursor; tab.after.hidden = !tab.nextCursor; tab.refresh.hidden = false; tab.lastReference = tab.messages.lastElementChild?.dataset.reference;
  const n = tab.messages.children.length; tab.status.textContent = n + (n === 1 ? ' mensagem carregada.' : ' mensagens carregadas.') + (!tab.previousCursor || !tab.nextCursor ? ' Não há mais mensagens arquivadas nesta direção.' : '');
  if (selected === tab.conversation.id) { lastReference = tab.lastReference; if (anchor) window.scrollBy(0, anchor.getBoundingClientRect().top - offset); }
}
async function openContext(reference, sourceSnapshotId, conversationId) {
  if (!authenticated || suspended || pendingContexts.has(conversationId)) return;
  closePreviews();
  const version = readVersion, navigation = ++navigationVersion, operation = {}; let tab = tabs.get(conversationId);
  if (tab?.loading) return; pendingContexts.set(conversationId, operation);
  const ticket = tab ? ++tab.generation : 0;
  if (tab) { tab.loading = true; tab.status.textContent = 'Carregando contexto…'; tab.panel.setAttribute('aria-busy', 'true'); }
  $('reader').setAttribute('aria-busy', 'true');
  try {
    const query = new URLSearchParams(); if (sourceSnapshotId) query.set('sourceSnapshotId', sourceSnapshotId);
    const response = await request('/api/context/' + encodeURIComponent(reference) + '?' + query);
    const valid = () => version === readVersion && authenticated && !suspended && pendingContexts.get(conversationId) === operation && (!tab || ticket === tab.generation && tabs.get(conversationId) === tab);
    if (!valid()) return;
    const data = await response.json(); if (!valid()) return;
    if (!response.ok) { const status = response.status === 410 || [413, 429].includes(response.status) ? data.error : response.status === 404 ? 'Não encontrado no acervo. Volte aos resultados.' : 'Não foi possível carregar o contexto. Tente abrir novamente.'; if (tab) tab.status.textContent = status; else if (navigation === navigationVersion) $('reader-status').textContent = status; return; }
    const canonical = tabs.get(data.conversation.id);
    if (tab && tab !== canonical && tab.conversation.id !== data.conversation.id) { const wasActive = selected === tab.conversation.id; ++tab.generation; tabs.delete(tab.conversation.id); releasePanel(tab.panel); tab.panel.remove(); tab.button.parentElement.remove(); if (wasActive) selected = undefined; }
    tab = canonical ?? createTab(data.conversation); renderContext(tab, data);
    if (navigation === navigationVersion) { activateTab(tab, false); tab.messages.querySelector('[data-anchor=true]')?.focus(); }
  } catch (error) { if (version === readVersion && pendingContexts.get(conversationId) === operation) { if (tab && !['stale', 'expired'].includes(error.message)) tab.status.textContent = 'Não foi possível carregar o contexto. Tente abrir novamente.'; if (navigation === navigationVersion) failure(error); } }
  finally { if (version === readVersion && pendingContexts.get(conversationId) === operation) { pendingContexts.delete(conversationId); if (tab) { tab.loading = false; tab.panel.removeAttribute('aria-busy'); } const active = tabs.get(selected); reading = active?.loading ?? false; $('reader').setAttribute('aria-busy', String(reading)); } }
}
async function contextPage(tab, direction) {
  if (!authenticated || suspended || tab.loading) return;
  const cursor = direction === 'before' ? tab.previousCursor : tab.nextCursor; if (!cursor) return;
  const version = readVersion, ticket = ++tab.generation; tab.loading = true; tab.panel.setAttribute('aria-busy', 'true'); tab.status.textContent = 'Carregando contexto…'; tab.before.disabled = tab.after.disabled = true;
  try {
    const response = await request('/api/context/' + encodeURIComponent(tab.requestedReference) + '?direction=' + direction + '&cursor=' + encodeURIComponent(cursor));
    if (version !== readVersion || ticket !== tab.generation || tabs.get(tab.conversation.id) !== tab) return;
    const data = await response.json(); if (version !== readVersion || ticket !== tab.generation || tabs.get(tab.conversation.id) !== tab) return;
    if (!response.ok) { tab.status.textContent = response.status === 410 ? data.error : 'Não foi possível carregar o contexto. Tente abrir novamente.'; return; } renderContext(tab, data, direction);
  } catch (error) { if (version === readVersion && ticket === tab.generation) failure(error); }
  finally { if (version === readVersion && ticket === tab.generation) { tab.loading = false; tab.panel.removeAttribute('aria-busy'); tab.before.disabled = tab.after.disabled = false; } }
}
async function openConversation(id) {
  if (!authenticated || suspended) return;
  if (id !== selected) closePreviews();
  if (tabs.has(id)) { activateTab(tabs.get(id)); return; }
  const version = readVersion, navigation = ++navigationVersion;
  $('reader').setAttribute('aria-busy', 'true');
  try {
    const response = await request('/api/conversations/' + encodeURIComponent(id) + '/messages?limit=1'); const data = await response.json();
    if (version !== readVersion || navigation !== navigationVersion) return;
    if (!response.ok || !data.messages.length) { $('reader-status').textContent = 'Não encontrado no acervo. Esta conversa ainda não tem mensagens arquivadas.'; return; }
    const existing = tabs.get(data.conversation.id); if (existing) activateTab(existing); else await openContext(data.messages[0].reference, undefined, data.conversation.id);
  } catch (error) { if (version === readVersion && navigation === navigationVersion) failure(error); }
  finally { if (version === readVersion) $('reader').removeAttribute('aria-busy'); }
}
function back() { closePreviews();
  ++navigationVersion;
  const tab = tabs.get(selected); if (tab) tab.scroll = window.scrollY;
  $('archive').classList.remove('reading'); $('back').hidden = true;
  const link = [...$('conversations').querySelectorAll('a')].find(item => item.dataset.id === selected); link?.focus({ preventScroll: true }); window.scrollTo(0, listPosition);
}
async function refreshStatus() {
  if (!authenticated || suspended) return;
  const version = readVersion, ticket = ++statusVersion; $('status-loading').textContent = 'Conferindo estado e cobertura…';
  try {
    const response = await request('/api/status'); if (!response.ok) throw Error('server');
    const data = await response.json(); if (version !== readVersion || ticket !== statusVersion) return;
    const states = { 'awaiting-pairing': 'Aguardando pareamento', connecting: 'Conectando', connected: 'Conectado', reconnecting: 'Reconectando', disconnected: 'Desconectado', 'invalid-session': 'Sessão inválida' };
    $('connection').textContent = (states[data.connection] ?? unknown) + (data.connection === 'disconnected' ? ' — WhatsApp desconectado. Você pode consultar o material já arquivado.' : data.connection === 'reconnecting' ? ' — Reconectando ao WhatsApp. Novas capturas podem demorar; o acervo salvo continua disponível.' : data.connection === 'invalid-session' ? ' — O vínculo precisa ser refeito no celular. O material já arquivado continua disponível.' : '');
    const coverage = data.coverage; $('coverage').replaceChildren(); $('coverage-batches').replaceChildren();
    if (coverage) {
      for (const [label, value] of [['Última ingestão confirmada — America/Sao_Paulo', coverage.lastIngestion ? date(coverage.lastIngestion) : 'Nenhuma ingestão confirmada ainda.'], ['Intervalo observado — America/Sao_Paulo', coverage.interval.oldest ? date(coverage.interval.oldest) + ' até ' + date(coverage.interval.newest) : 'Intervalo observado ainda desconhecido.'], ['Mensagens únicas arquivadas', String(coverage.uniqueMessages)]]) { addText($('coverage'), 'dt', label); addText($('coverage'), 'dd', value); }
      for (const batch of coverage.batches) {
        const li = addText($('coverage-batches'), 'li', batch.confirmed + ' de ' + batch.received + (batch.received === 1 ? ' mensagem recebida arquivada neste lote.' : ' mensagens recebidas arquivadas neste lote.')); detail(li, 'Falhas / pendentes', batch.failed + ' / ' + batch.pending);
        addText(li, 'p', batch.failed || batch.pending ? 'Há itens deste lote ainda não arquivados. Confira as falhas conhecidas.' : 'Lote recebido concluído; a cobertura da conta continua limitada ao material recebido.');
        if (batch.stalled) addText(li, 'p', 'Coleta sem progresso há pelo menos 120 segundos. O acervo anterior permanece disponível.');
        if (batch.failure) addText(li, 'p', 'A captura encontrou uma falha. Alguns itens recebidos podem não ter sido arquivados. O acervo anterior permanece disponível.');
      }
      for (const status of coverage.historyStatuses) addText($('coverage-batches'), 'li', 'Estado recebido do lote: ' + status.status + ' · ' + (status.explicit ? 'Explícito da origem' : 'Inferido por timeout') + '. Não garante histórico integral da conta.');
      if (!coverage.batches.some(batch => batch.failed || batch.failure)) addText($('coverage-batches'), 'li', 'Nenhuma falha conhecida registrada.');
    }
    attemptsLimit = data.media?.attemptsLimit; $('media-status').textContent = data.media?.diagnostic ?? (data.connection !== 'connected' ? 'A retomada aguarda conexão com o WhatsApp.' : '');
    hideQr(); $('pairing').hidden = false;
    $('qr-status').textContent = !data.collectorEnabled ? 'Pareamento ainda indisponível. A preparação da cópia recuperável precisa ser concluída no host.' : data.connection === 'connected' ? 'Conta vinculada. O arquivo mostra apenas o material efetivamente recebido.' : data.connection === 'awaiting-pairing' ? (data.pairingAvailable ? 'Aguardando um QR válido…' : 'Este QR expirou. Aguarde um novo código.') : 'Aguardando um QR válido…';
    if (data.connection === 'awaiting-pairing' && data.pairingAvailable) {
      const response = await request('/api/qr');
      if (response.status === 409) { if (version === readVersion && ticket === statusVersion) $('qr-status').textContent = 'Este QR expirou. Aguarde um novo código.'; return; }
      if (!response.ok) throw Error('server'); const pairing = await response.json(); if (version !== readVersion || ticket !== statusVersion) return;
      if (pairing.generation !== data.generation || !/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(pairing.image) || !Number.isFinite(Date.parse(pairing.expiresAt)) || Date.parse(pairing.expiresAt) <= Date.now()) { $('qr-status').textContent = 'Este QR expirou. Aguarde um novo código.'; return; }
      const img = document.createElement('img'); img.id = 'qr'; img.width = img.height = 256; img.alt = 'QR para vincular a conta no WhatsApp do celular'; img.src = pairing.image; $('pairing').insertBefore(img, $('qr-instruction'));
      $('qr-status').textContent = ''; $('qr-instruction').hidden = false; qrTimer = setTimeout(() => { hideQr(); $('qr-status').textContent = 'Este QR expirou. Aguarde um novo código.'; }, Date.parse(pairing.expiresAt) - Date.now());
    }
    if (selected && !reading) {
      const id = selected, navigation = navigationVersion, latest = await request('/api/conversations/' + encodeURIComponent(id) + '/messages?limit=1');
      if (latest.ok) { const page = await latest.json(); if (version === readVersion && ticket === statusVersion && navigation === navigationVersion && selected === id && tabs.has(id)) { const tab = tabs.get(id); const changed = page.messages.at(-1)?.reference !== tab.lastReference; tab.refresh.hidden = false; tab.refresh.textContent = changed ? 'Há novas mensagens arquivadas. Atualizar conversa' : 'Atualizar conversa'; } }
    }
    return version === readVersion && ticket === statusVersion;
  } catch (error) { if (version === readVersion && ticket === statusVersion) failure(error); }
  finally { if (version === readVersion && ticket === statusVersion) $('status-loading').textContent = ''; }
}
async function enter() {
  authenticated = true; $('login-panel').hidden = true; $('archive').hidden = false; $('archive-error').textContent = ''; $('retry').hidden = true;
  const version = readVersion; await refreshStatus(); if (version !== readVersion || !authenticated) return;
  await list(); const id = new URL(location.href).searchParams.get('conversation'); if (version === readVersion && id) await openConversation(id);
}
$('login-form').addEventListener('submit', async event => {
  event.preventDefault(); if ($('login-button').disabled) return;
  if (!$('password').value) { $('login-error').textContent = 'Informe a senha para entrar.'; $('password').focus(); return; }
  $('login-button').disabled = true; $('login-form').setAttribute('aria-busy', 'true'); $('login-error').textContent = ''; $('login-status').textContent = 'Entrando no acervo…';
  try {
    await challenge(); const response = await request('/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: $('password').value, csrfToken }) }); $('password').value = '';
    if (!response.ok) { const retry = response.headers.get('Retry-After'); $('login-error').textContent = response.status === 429 ? 'Muitas tentativas. Aguarde o prazo indicado e tente novamente.' + (retry ? ' Prazo: ' + retry + ' segundos.' : '') : 'Não foi possível entrar. Confira a senha e tente novamente.'; $('password').focus(); return; }
    if (!(await challenge()).authenticated) { signedOut(expired); return; } await enter(); if (!selected && authenticated) $('conversations').querySelector('a')?.focus();
  } catch (error) { if (!['expired', 'stale'].includes(error.message)) $('login-error').textContent = noServer; }
  finally { $('password').value = ''; $('login-button').disabled = false; $('login-form').removeAttribute('aria-busy'); $('login-status').textContent = ''; }
});
$('logout-button').addEventListener('click', async () => {
  clearExport(); exportView();
  closePreviews();
  ++readVersion; ++navigationVersion; pendingContexts.clear();
  for (const tab of tabs.values()) { ++tab.generation; tab.loading = false; tab.panel.removeAttribute('aria-busy'); tab.before.disabled = tab.after.disabled = false; }
  $('logout-button').disabled = true;
  try {
    const response = await request('/logout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ csrfToken }) });
    if (!response.ok) throw Error('server'); signedOut(); await challenge();
  } catch (error) { if (!['expired', 'stale'].includes(error.message) && authenticated) $('archive-error').textContent = 'Não foi possível encerrar a sessão. Tente sair novamente.'; }
  finally { $('logout-button').disabled = false; }
});
$('back').addEventListener('click', event => { event.preventDefault(); history.pushState({}, '', '/'); back(); });
$('more-conversations').addEventListener('click', () => list(true));
$('retry').addEventListener('click', async () => {
  try { if (!(await challenge()).authenticated) { signedOut(expired); return; } $('archive-error').textContent = ''; $('retry').hidden = true; await refreshStatus(); await list(); if (selected) await openConversation(selected, false, true); }
  catch (error) { failure(error); }
});
window.addEventListener('popstate', async () => { if (!authenticated) return; try { if (!(await challenge()).authenticated) { signedOut(expired); return; } const id = new URL(location.href).searchParams.get('conversation'); if (id) openConversation(id); else back(); } catch (error) { failure(error); } });
window.addEventListener('offline', () => { if (authenticated) failure(new TypeError('network')); });
async function revalidate() {
  if (!authenticated) return; const version = readVersion, wasOffline = $('archive-error').textContent === noServer; hideQr();
  try {
    const previousToken = csrfToken, session = await challenge(); if (version !== readVersion) return;
    if (!session.authenticated || previousToken !== csrfToken) { signedOut(expired); return; } suspended = false; $('archive').hidden = false; $('login-panel').hidden = true;
    if (exportJob) pollExport();
    if (await refreshStatus() && version === readVersion && wasOffline) $('archive-error').textContent = 'Acesso ao servidor restabelecido. Atualize os dados para conferir o estado atual.';
  }
  catch (error) { failure(error); if ($('archive').hidden && authenticated) { $('login-panel').hidden = false; $('login-error').textContent = noServer; } }
}
window.addEventListener('online', revalidate); window.addEventListener('pageshow', event => { if (event.persisted) revalidate(); });
window.addEventListener('pagehide', () => { ++exportVersion; clearTimeout(exportTimer); closePreviews(); hideQr(); if (authenticated) { suspended = true; ++readVersion; ++navigationVersion; pendingContexts.clear(); for (const tab of tabs.values()) { ++tab.generation; tab.loading = false; tab.panel.removeAttribute('aria-busy'); tab.before.disabled = tab.after.disabled = false; for (const player of tab.panel.querySelectorAll('audio,video')) player.pause(); } $('archive').hidden = true; } });
setInterval(() => { if (authenticated && document.visibilityState === 'visible') refreshStatus(); }, 10_000);
challenge().then(data => data.authenticated ? enter() : signedOut()).catch(() => { $('login-error').textContent = noServer; });
