const $ = id => document.getElementById(id);
const date = value => value ? new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).format(new Date(value)).replace(',', '') : 'Não informado pela origem';
let csrfToken, listCursor, messageCursor, selected, listPosition = 0, reading = false;
let readVersion = 0, navigationVersion = 0;

function signedOut(message = '') {
  ++readVersion; ++navigationVersion; selected = undefined; listCursor = undefined; messageCursor = undefined;
  $('archive').hidden = true; $('login-panel').hidden = false;
  $('conversations').replaceChildren(); $('messages').replaceChildren();
  document.getElementById('coverage-batches')?.remove();
  $('connection').parentElement.querySelector('dl').replaceChildren();
  $('message-title').textContent = 'Mensagens arquivadas';
  $('login-error').textContent = message; $('password').value = '';
  $('password').focus();
}
async function request(path, options) {
  const response = await fetch(path, { cache: 'no-store', ...options });
  if (response.status === 401 && path !== '/login') { signedOut('Sua sessão expirou. Entre novamente para acessar o acervo.'); throw Error('expired'); }
  return response;
}
async function challenge() {
  const response = await request('/api/session'); if (!response.ok) throw Error('server');
  const data = await response.json(); csrfToken = data.csrfToken; return data;
}
function failure() { $('archive-error').textContent = 'Não foi possível carregar o acervo. Tente carregar novamente.'; $('retry').hidden = false; }
function addText(parent, tag, text, className) {
  const element = document.createElement(tag); element.textContent = text; if (className) element.className = className; parent.append(element); return element;
}
async function list(append = false) {
  const version = readVersion; $('list-status').textContent = 'Carregando conversas…'; $('conversation-panel').setAttribute('aria-busy', 'true'); $('more-conversations').disabled = true;
  try {
    const response = await request('/api/conversations' + (append && listCursor ? '?cursor=' + encodeURIComponent(listCursor) : ''));
    if (!response.ok) throw Error('server'); const data = await response.json(); if (version !== readVersion) return;
    if (!append) $('conversations').replaceChildren();
    for (const conversation of data.conversations) {
      const li = document.createElement('li'); const link = addText(li, 'a', conversation.name ?? 'Conversa sem nome recebido');
      link.href = '/?conversation=' + encodeURIComponent(conversation.id); link.dataset.id = conversation.id;
      addText(link, 'span', 'Referência: ' + conversation.id, 'meta');
      addText(link, 'span', 'Última data: ' + date(conversation.lastTimestamp), 'meta');
      link.addEventListener('click', event => { event.preventDefault(); listPosition = window.scrollY; history.pushState({}, '', link.href); openConversation(conversation.id); });
      $('conversations').append(li);
    }
    listCursor = data.nextCursor; $('more-conversations').hidden = !listCursor; $('empty-list').hidden = $('conversations').children.length !== 0;
    $('list-status').textContent = '';
  } catch (error) { if (error.message !== 'expired') failure(); }
  finally { $('conversation-panel').removeAttribute('aria-busy'); $('more-conversations').disabled = false; }
}
async function openConversation(id, append = false) {
  if (append && reading) return;
  reading = true; const version = readVersion, navigation = ++navigationVersion;
  $('reader-status').textContent = 'Carregando mensagens…'; $('reader').setAttribute('aria-busy', 'true'); $('more-messages').disabled = true;
  try {
    const response = await request('/api/conversations/' + encodeURIComponent(id) + '/messages' + (append && messageCursor ? '?cursor=' + encodeURIComponent(messageCursor) : ''));
    if (version !== readVersion || navigation !== navigationVersion) return;
    if (response.status === 404) { $('archive').classList.add('reading'); $('back').hidden = false; $('messages').replaceChildren(); $('more-messages').hidden = true; $('reader-status').textContent = 'Não encontrado no acervo. Volte à lista de conversas.'; $('message-title').focus(); return; }
    if (!response.ok) throw Error('server'); const data = await response.json(); if (version !== readVersion || navigation !== navigationVersion) return;
    selected = id; $('archive').classList.add('reading'); $('back').hidden = false;
    $('message-title').textContent = data.conversation.name ?? 'Conversa sem nome recebido';
    for (const link of $('conversations').querySelectorAll('a')) { if (link.dataset.id === id) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current'); }
    if (!append) $('messages').replaceChildren();
    const fragment = document.createDocumentFragment();
    for (const message of data.messages) {
      const li = document.createElement('li'); const article = document.createElement('article'); li.append(article);
      const header = document.createElement('header'); article.append(header);
      addText(header, 'p', (message.author ?? 'Autor não informado pela origem') + ' · ' + (message.fromMe === true ? 'Enviada pelo celular' : message.fromMe === false ? 'Recebida' : 'Direção não informada pela origem'), 'meta');
      const time = addText(header, 'time', date(message.originalTimestamp), 'meta'); if (message.originalTimestamp) time.dateTime = message.originalTimestamp;
      const text = addText(article, 'p', message.restricted ? 'Conteúdo restrito — visualização única. Somente metadados foram arquivados.' : message.revoked ? 'Revogação observada. O conteúdo permitido capturado está no histórico abaixo.' : message.orderUncertain ? 'Ordem das alterações incerta. Confira o histórico recebido.' : message.text ?? 'Conteúdo não informado pela origem'); text.dir = 'auto';
      addText(article, 'p', 'Referência: ' + message.reference + ' · Tipo: ' + (message.type === 'unknown' ? 'Não informado pela origem' : message.type), 'meta');
      if (message.quote) {
        addText(article, 'blockquote', message.quote.restricted ? 'Citação restrita — somente metadados.' : message.quote.text ?? 'Mensagem citada não encontrada no acervo.');
        addText(article, 'p', 'Citação: ' + (message.quote.id ?? 'ID não recebido') + ' · Autor: ' + (message.quote.author ?? 'Não informado pela origem'), 'meta');
      }
      for (const attachment of message.attachments ?? []) addText(article, 'p', 'Anexo: ' + (attachment.name ?? 'Nome não informado pela origem') + ' · ' + (attachment.state === 'pending' ? 'Aguardando captura' : attachment.state), 'meta');
      const details = document.createElement('details'); article.append(details);
      addText(details, 'summary', 'Detalhes da evidência'); addText(details, 'p', 'Instante original: ' + (message.originalTimestamp ?? 'Não informado pela origem'));
      addText(details, 'p', 'Chaves originais recebidas: ' + (message.origins?.length ? JSON.stringify(message.origins) : 'Não informado pela origem'));
      if (message.identityMappings?.length) addText(details, 'p', 'Mapeamentos recebidos PN/LID: ' + JSON.stringify(message.identityMappings));
      if (message.expirationSeconds !== null && message.expirationSeconds !== undefined) addText(details, 'p', 'Expiração recebida: ' + message.expirationSeconds + ' segundos. Conteúdo permitido retido no arquivo.');
      if (message.revisions?.length) {
        addText(details, 'h3', 'Histórico observado');
        for (const revision of message.revisions) {
          addText(details, 'p', revision.kind + ' · Observada em ' + date(revision.observedAt) + ' · Instante da origem: ' + (revision.sourceTimestamp ?? 'Não informado pela origem'), 'meta');
          addText(details, 'p', revision.restricted ? 'Conteúdo restrito — somente metadados.' : revision.text ?? 'Sem corpo recebido nesta alteração.');
        }
      }
      fragment.append(li);
    }
    if (append) $('messages').prepend(fragment); else $('messages').append(fragment);
    messageCursor = data.nextCursor; $('more-messages').hidden = !messageCursor;
    $('reader-status').textContent = data.messages.length ? (messageCursor ? '' : 'Não há mais mensagens arquivadas nesta direção.') : 'Não encontrado no acervo. Esta conversa ainda não tem mensagens arquivadas.';
    if (!append) $('message-title').focus();
  } catch (error) { if (error.message !== 'expired') failure(); }
  finally { if (navigation === navigationVersion) { reading = false; $('reader').removeAttribute('aria-busy'); $('more-messages').disabled = false; } }
}
function back() {
  ++navigationVersion; reading = false;
  $('archive').classList.remove('reading'); $('back').hidden = true;
  $('messages').replaceChildren(); $('message-title').textContent = 'Mensagens arquivadas';
  $('reader-status').textContent = 'Abra uma conversa da lista para ler as mensagens arquivadas.';
  $('more-messages').hidden = true;
  const link = [...$('conversations').querySelectorAll('a')].find(item => item.dataset.id === selected);
  link?.focus({ preventScroll: true }); window.scrollTo(0, listPosition); selected = undefined;
}
async function enter() {
  const version = readVersion;
  $('login-panel').hidden = true; $('archive').hidden = false; $('archive-error').textContent = ''; $('retry').hidden = true;
  const response = await request('/api/status'); if (!response.ok) throw Error('server');
  const data = await response.json(); if (version !== readVersion) return; $('connection').textContent = data.connection === 'disconnected' ? 'WhatsApp desconectado. Você pode consultar o material já arquivado.' : 'Estado recebido: ' + data.connection;
  const coverage = data.coverage;
  if (coverage) {
    const section = $('connection').parentElement;
    const dl = section.querySelector('dl'); dl.replaceChildren();
    addText(dl, 'dt', 'Última ingestão confirmada — America/Sao_Paulo'); addText(dl, 'dd', coverage.lastIngestion ? date(coverage.lastIngestion) : 'Nenhuma ingestão confirmada ainda.');
    addText(dl, 'dt', 'Intervalo observado — America/Sao_Paulo'); addText(dl, 'dd', coverage.interval.oldest ? date(coverage.interval.oldest) + ' até ' + date(coverage.interval.newest) : 'Intervalo observado ainda desconhecido.');
    addText(dl, 'dt', 'Mensagens únicas arquivadas'); addText(dl, 'dd', String(coverage.uniqueMessages));
    let batches = document.getElementById('coverage-batches');
    if (!batches) { batches = document.createElement('ul'); batches.id = 'coverage-batches'; section.append(batches); } batches.replaceChildren();
    for (const batch of coverage.batches) {
      const li = addText(batches, 'li', batch.confirmed + ' de ' + batch.received + ' itens recebidos arquivados neste lote. Falhas: ' + batch.failed + '. Pendentes: ' + batch.pending + '.');
      if (batch.failed || batch.pending) addText(li, 'p', 'Há itens deste lote ainda não arquivados. Confira as falhas conhecidas.');
      if (batch.stalled) addText(li, 'p', 'Coleta sem progresso há pelo menos 120 segundos. O acervo anterior permanece disponível.');
      if (batch.failure) addText(li, 'p', batch.failure);
    }
    for (const status of coverage.historyStatuses) addText(batches, 'li', 'Estado recebido do lote: ' + status.status + ' · ' + (status.explicit ? 'Explícito da origem' : 'Inferido por timeout') + '. Não garante histórico integral da conta.');
  }
  await list(); const id = new URL(location.href).searchParams.get('conversation'); if (id) await openConversation(id);
}
$('login-form').addEventListener('submit', async event => {
  event.preventDefault(); if ($('login-button').disabled) return;
  if (!$('password').value) { $('login-error').textContent = 'Informe a senha para entrar.'; $('password').focus(); return; }
  $('login-button').disabled = true; $('login-form').setAttribute('aria-busy', 'true'); $('login-error').textContent = ''; $('login-status').textContent = 'Entrando no acervo…';
  try {
    await challenge();
    const response = await request('/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: $('password').value, csrfToken }) });
    $('password').value = '';
    if (!response.ok) { $('login-error').textContent = response.status === 429 ? 'Muitas tentativas. Aguarde o prazo indicado e tente novamente. Prazo: ' + response.headers.get('Retry-After') + ' segundos.' : 'Não foi possível entrar. Confira a senha e tente novamente.'; $('password').focus(); return; }
    await challenge(); await enter(); if (!selected) $('conversations').querySelector('a')?.focus();
  } catch (error) { if (error.message !== 'expired') $('login-error').textContent = 'Sem acesso ao servidor. Tente carregar novamente quando a conexão voltar.'; }
  finally { $('login-button').disabled = false; $('login-form').removeAttribute('aria-busy'); $('login-status').textContent = ''; }
});
$('logout-button').addEventListener('click', async () => {
  $('logout-button').disabled = true;
  try {
    const response = await request('/logout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ csrfToken }) });
    if (!response.ok) throw Error('server'); signedOut(); history.replaceState({}, '', '/'); await challenge();
  } catch (error) { if (error.message !== 'expired') $('archive-error').textContent = 'Não foi possível encerrar a sessão. Tente sair novamente.'; }
  finally { $('logout-button').disabled = false; }
});
$('back').addEventListener('click', event => { event.preventDefault(); history.pushState({}, '', '/'); back(); });
$('more-conversations').addEventListener('click', () => list(true));
$('more-messages').addEventListener('click', () => openConversation(selected, true));
$('retry').addEventListener('click', async () => { $('archive-error').textContent = ''; $('retry').hidden = true; try { await enter(); } catch (error) { if (error.message !== 'expired') failure(); } });
window.addEventListener('popstate', () => { const id = new URL(location.href).searchParams.get('conversation'); if (id) openConversation(id); else back(); });
window.addEventListener('pageshow', async event => { if (event.persisted) { try { const data = await challenge(); if (!data.authenticated) signedOut('Sua sessão expirou. Entre novamente para acessar o acervo.'); } catch { failure(); } } });
challenge().then(data => data.authenticated ? enter() : signedOut()).catch(() => { $('login-error').textContent = 'Sem acesso ao servidor. Tente carregar novamente quando a conexão voltar.'; });
