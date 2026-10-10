const $ = id => document.getElementById(id);
const unknown = 'Não informado pela origem', expired = 'Sua sessão expirou. Entre novamente para acessar o acervo.';
const noServer = 'Sem acesso ao servidor. O conteúdo exibido pode estar desatualizado. Tente carregar novamente quando a conexão voltar.';
const date = value => value ? new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).format(new Date(value)).replace(',', '') : unknown;
let csrfToken, listCursor, messageCursor, selected, listPosition = 0, reading = false, authenticated = false;
let readVersion = 0, navigationVersion = 0, statusVersion = 0, qrTimer, lastReference, attemptsLimit;
function hideQr() { clearTimeout(qrTimer); $('qr')?.remove(); $('qr-instruction').hidden = true; }
function signedOut(message = '') {
  ++readVersion; ++navigationVersion; ++statusVersion;
  authenticated = reading = false; selected = listCursor = messageCursor = csrfToken = lastReference = attemptsLimit = undefined;
  hideQr();
  $('archive').hidden = true; $('archive').classList.remove('reading'); $('login-panel').hidden = false;
  for (const id of ['conversations', 'messages', 'coverage', 'coverage-batches']) $(id).replaceChildren();
  for (const id of ['connection', 'qr-status', 'media-status', 'archive-error', 'list-status', 'status-loading']) $(id).textContent = '';
  for (const id of ['pairing', 'back', 'more-conversations', 'more-messages', 'refresh-conversation', 'retry', 'empty-list']) $(id).hidden = true;
  for (const id of ['reader', 'conversation-panel']) $(id).removeAttribute('aria-busy');
  $('message-title').textContent = 'Mensagens arquivadas'; $('reader-status').textContent = 'Abra uma conversa da lista para ler as mensagens arquivadas.';
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
  addText(block, 'h3', attachment.name ?? 'Nome original não informado'); detail(block, 'Tipo recebido', attachment.type); detail(block, 'Tamanho local em bytes', attachment.size);
  detail(block, 'SHA-256 local', attachment.sha256); detail(block, 'Hash de origem', attachment.sourceHashVerified ? 'Conferido com o original preservado' : attachment.state === 'available' ? 'Não informado pela origem' : 'Comparação ainda não confirmada');
  const reason = attachment.reason ?? unknown;
  const state = attachment.state === 'available' ? 'Disponível — arquivo finalizado e verificado.' : attachment.state === 'downloading' ? 'Pendente — download em andamento.' : attachment.state === 'pending' ? 'Pendente — o original ainda não foi preservado.' : attachment.state === 'retry_wait' ? 'Falha recuperável — ' + reason + '. Tentativas: ' + attachment.attempts + '/' + (attemptsLimit ?? unknown) + '.' : 'Indisponível — ' + reason + '. A mensagem permanece no acervo.';
  addText(block, 'p', state); if (attachment.state !== 'available') return;
  const link = addText(block, 'a', 'Baixar original', 'download'); link.href = '/api/attachments/' + encodeURIComponent(attachment.id); link.download = attachment.name ?? 'original';
  const status = addText(block, 'p', '', 'meta'); status.setAttribute('role', 'status');
  link.addEventListener('click', async event => {
    event.preventDefault(); if (link.getAttribute('aria-busy') === 'true') return;
    const version = readVersion; link.setAttribute('aria-busy', 'true'); status.textContent = 'Carregando original…';
    try {
      const response = await request(link.getAttribute('href'), { method: 'HEAD' }); if (!response.ok) throw Error('download');
      if (version !== readVersion || !authenticated) return;
      const save = document.createElement('a'); save.href = link.href; save.download = ''; document.body.append(save); save.click(); save.remove();
      status.textContent = 'Download solicitado ao navegador. Confira a conclusão nos downloads.';
    } catch (error) { if (version === readVersion && !['expired', 'stale'].includes(error.message)) { status.textContent = 'Não foi possível baixar o original. Confira o estado do anexo e tente novamente se ele estiver disponível.'; if (error instanceof TypeError) failure(error); } }
    finally { link.removeAttribute('aria-busy'); }
  });
}
function messageItem(message) {
  const li = document.createElement('li'), article = document.createElement('article'); li.append(article); li.dataset.reference = message.reference;
  const header = document.createElement('header'); article.append(header);
  addText(header, 'p', (message.author ?? 'Autor não informado pela origem') + ' · ' + (message.fromMe === true ? 'Enviada pelo celular' : message.fromMe === false ? 'Recebida' : 'Direção não informada pela origem'), 'meta');
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
    detail(quote, 'Autor recebido', message.quote.author); detail(quote, 'Referência recebida', message.quote.id); addText(quote, 'p', 'Citação recebida; original não encontrado no acervo.');
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
async function openConversation(id, append = false, refresh = false) {
  if (!authenticated || append && reading) return;
  reading = true; const version = readVersion, navigation = ++navigationVersion;
  $('reader-status').textContent = 'Carregando mensagens…'; $('reader').setAttribute('aria-busy', 'true'); $('more-messages').disabled = true;
  try {
    const response = await request('/api/conversations/' + encodeURIComponent(id) + '/messages' + (append && messageCursor ? '?cursor=' + encodeURIComponent(messageCursor) : ''));
    if (version !== readVersion || navigation !== navigationVersion) return;
    if (response.status === 404) { $('archive').classList.add('reading'); $('back').hidden = false; $('messages').replaceChildren(); $('more-messages').hidden = true; $('reader-status').textContent = 'Não encontrado no acervo. Volte à lista de conversas.'; $('message-title').textContent = 'Mensagens arquivadas'; $('message-title').focus(); return; }
    if (!response.ok) throw Error('server'); const data = await response.json(); if (version !== readVersion || navigation !== navigationVersion) return;
    const anchor = append ? $('messages').firstElementChild : null, offset = anchor?.getBoundingClientRect().top;
    selected = id; $('archive').classList.add('reading'); $('back').hidden = false; $('message-title').textContent = data.conversation.name ?? 'Conversa sem nome recebido';
    for (const link of $('conversations').querySelectorAll('a')) { if (link.dataset.id === id) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current'); }
    if (!append) { $('messages').replaceChildren(); lastReference = data.messages.at(-1)?.reference; }
    const fragment = document.createDocumentFragment(); for (const message of data.messages) fragment.append(messageItem(message));
    if (append) $('messages').prepend(fragment); else $('messages').append(fragment);
    messageCursor = data.nextCursor; $('more-messages').hidden = !messageCursor; $('refresh-conversation').hidden = true;
    $('reader-status').textContent = data.messages.length ? (messageCursor ? '' : 'Não há mais mensagens arquivadas nesta direção.') : 'Não encontrado no acervo. Esta conversa ainda não tem mensagens arquivadas.';
    if (anchor) window.scrollBy(0, anchor.getBoundingClientRect().top - offset);
    if (!append && !refresh) $('message-title').focus();
  } catch (error) { if (version === readVersion && navigation === navigationVersion) failure(error); }
  finally { if (version === readVersion && navigation === navigationVersion) { reading = false; $('reader').removeAttribute('aria-busy'); $('more-messages').disabled = false; } }
}
function back() {
  ++navigationVersion; reading = false; $('reader').removeAttribute('aria-busy'); $('more-messages').disabled = false;
  $('archive').classList.remove('reading'); $('back').hidden = true; $('messages').replaceChildren(); $('message-title').textContent = 'Mensagens arquivadas';
  $('reader-status').textContent = 'Abra uma conversa da lista para ler as mensagens arquivadas.'; $('more-messages').hidden = true; $('refresh-conversation').hidden = true;
  const link = [...$('conversations').querySelectorAll('a')].find(item => item.dataset.id === selected);
  link?.focus({ preventScroll: true }); window.scrollTo(0, listPosition); selected = lastReference = undefined;
}
async function refreshStatus() {
  if (!authenticated) return;
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
        const li = addText($('coverage-batches'), 'li', batch.confirmed + ' de ' + batch.received + ' mensagens recebidas arquivadas neste lote.'); detail(li, 'Falhas / pendentes', batch.failed + ' / ' + batch.pending);
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
      if (latest.ok) { const page = await latest.json(); if (version === readVersion && ticket === statusVersion && navigation === navigationVersion && selected === id) $('refresh-conversation').hidden = page.messages.at(-1)?.reference === lastReference; }
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
  $('logout-button').disabled = true;
  try {
    const response = await request('/logout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ csrfToken }) });
    if (!response.ok) throw Error('server'); signedOut(); await challenge();
  } catch (error) { if (!['expired', 'stale'].includes(error.message) && authenticated) $('archive-error').textContent = 'Não foi possível encerrar a sessão. Tente sair novamente.'; }
  finally { $('logout-button').disabled = false; }
});
$('back').addEventListener('click', event => { event.preventDefault(); history.pushState({}, '', '/'); back(); });
$('more-conversations').addEventListener('click', () => list(true));
$('more-messages').addEventListener('click', () => openConversation(selected, true));
$('refresh-conversation').addEventListener('click', () => openConversation(selected, false, true));
$('retry').addEventListener('click', async () => {
  try { if (!(await challenge()).authenticated) { signedOut(expired); return; } $('archive-error').textContent = ''; $('retry').hidden = true; await refreshStatus(); await list(); if (selected) await openConversation(selected, false, true); }
  catch (error) { failure(error); }
});
window.addEventListener('popstate', async () => { if (!authenticated) return; try { if (!(await challenge()).authenticated) { signedOut(expired); return; } const id = new URL(location.href).searchParams.get('conversation'); if (id) openConversation(id); else back(); } catch (error) { failure(error); } });
window.addEventListener('offline', () => { if (authenticated) failure(new TypeError('network')); });
async function revalidate() {
  if (!authenticated) return; const version = readVersion, wasOffline = $('archive-error').textContent === noServer; hideQr();
  try {
    const session = await challenge(); if (version !== readVersion) return;
    if (!session.authenticated) { signedOut(expired); return; } $('archive').hidden = false; $('login-panel').hidden = true;
    if (await refreshStatus() && version === readVersion && wasOffline) $('archive-error').textContent = 'Acesso ao servidor restabelecido. Atualize os dados para conferir o estado atual.';
  }
  catch (error) { failure(error); if ($('archive').hidden && authenticated) { $('login-panel').hidden = false; $('login-error').textContent = noServer; } }
}
window.addEventListener('online', revalidate); window.addEventListener('pageshow', event => { if (event.persisted) revalidate(); });
window.addEventListener('pagehide', () => { hideQr(); if (authenticated) $('archive').hidden = true; });
setInterval(() => { if (authenticated && document.visibilityState === 'visible') refreshStatus(); }, 10_000);
challenge().then(data => data.authenticated ? enter() : signedOut()).catch(() => { $('login-error').textContent = noServer; });
