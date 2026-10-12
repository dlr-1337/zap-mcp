# Phase 4: Operação e restauração na VPS - Context

**Gathered:** 2026-10-12
**Status:** Ready for planning
**Modo:** `4 --all --auto`; dezesseis decisões escolhidas pelo agente dentro do escopo autorizado. São recomendações adotadas para planejamento, não respostas individuais atribuídas ao usuário.

<domain>
## Phase Boundary

Manter o arquivo privado na VPS com HTTPS e supervisão, persistência durante reinícios/atualizações, backup consistente cifrado fora da VPS e restauração conferida em diretório limpo. Demonstrar o fluxo real de busca, contexto, originais e exportação no site e no Codex instalado, também no acervo restaurado com coleta desligada. Responsabilidade: OPS-01/02/03/04; revalidar privacidade, somente leitura, proveniência e exclusividade do coletor no ambiente permanente.

Fases 1–3 locais concluídas; a fase 3 foi integrada na main. A prova MCP temporária, CA de subprocesso e tokens descartáveis foram encerrados: não há endpoint permanente comprovado. O login web sob TLS retornou Origin403 na prova anterior (WINDOWS13). As identidades da VPS, domínio/proxy e destino externo/chave continuam dependências de execução a identificar nos acessos disponíveis; isso não impede pesquisa/planejamento. Nenhum requisito OPS é concluído por esta discussão.
</domain>

<decisions>
## Implementation Decisions

### Decisões anteriores mantidas
- Uma conta, um proprietário, um coletor; serviço único Node24/TypeScript ESM, Express, SQLite FTS5 e mídia privada. Manter pins validados sem atualização preventiva.
- Site, exportação e MCP consultam o acervo local e continuam úteis sem WhatsApp. Nenhuma operação de enviar, editar, apagar ou confirmar leitura remota.
- Preservar IDs, autoria/direção, instante original, citações, alterações, PN/LID com evidência e faltantes; usar America/Sao_Paulo e não encontrado no acervo.
- Restrição atual prevalece sobre conteúdo congelado. Conteúdo recebido é dado não confiável; sessão, envelopes, chaves e caminhos internos ficam fora de interfaces/Git/logs.
- Senha do proprietário e acervo real existentes devem ser preservados. Não repetir pareamento válido, comparação manual dispensada ou implementação concluída.

### Endpoint HTTPS e acesso privado
- **D-01:** Reutilizar VPS, domínio/proxy e supervisão disponíveis após inventário privado e prova de acesso/capacidade. Não inventar host nem criar contratação para preencher uma lacuna.
- **D-02:** Uma origem HTTPS explícita para site/API/MCP, com backend privado. Validar Host/Origin e confiar apenas no proxy identificado; login, CSRF, cookie seguro, logout, downloads, Range e MCP precisam funcionar juntos. Resolver WINDOWS13 sem relaxar origens ou aceitar encaminhamento arbitrário.
- **D-03:** Preservar senha e identidade do proprietário; credencial MCP privada exclusiva no destino, revogável e sem literal em TOML/URL/prompt. Preservar outros servidores/configurações do Codex e invalidar sessões transitórias quando necessário ao handoff, sem reutilizar tokens do piloto encerrado.
- **D-04:** Reutilizar o supervisor do host com reinício limitado e encerramento gracioso. Distinguir serviço consultável, conexão WhatsApp e saúde do backup; status autenticado e logs operacionais mínimos, sem conversas, QR ou credenciais. Falha do coletor não deve tornar o arquivo inacessível.

### Migração, persistência e coletor exclusivo
- **D-05:** Levar o acervo real por snapshot consistente e conferido, preservando mensagens, referências, índices, originais, autenticação e estado da sessão. Manter fallback privado recuperável; conferir antes/depois sem reiniciar um perfil vazio.
- **D-06:** Parar e conferir a origem antes de habilitar coleta na VPS. Lock local não impede dois hosts usando a mesma sessão; handoff deve conferir supervisor/processo na origem e destino. Cópias de ensaio ficam offline; eventual ativação é promoção operacional controlada, nunca remoção manual de marcador para dispensar a prova.
- **D-07:** Dados em diretório/volume privado persistente fora do release/checkout, com dono exclusivo e privilégios mínimos. Medir espaço para acervo, fila, ZIP, snapshot e restore; não apagar mensagens/originais para liberar disco.
- **D-08:** Backup íntegro antes de migração e atualização; release recuperável e encerramento gracioso. Fallback deve considerar compatibilidade de schema e registros novos, sem restaurar dados antigos por cima do acervo atual ou reativar o coletor da origem simultaneamente.

### Backup externo, frequência e chave
- **D-09:** Backup diário e antes de migração/atualização, inicialmente por parada curta coordenada usando o snapshot existente. Objetivo operacional inicial: ponto recuperável de até 24h, a medir; não afirmar SLA por agendar. Falha de backup/transferência deve aparecer e permitir retomada do serviço sem rotular a cópia como pronta.
- **D-10:** Cópia cifrada fora da VPS, recuperada do destino para prova de integridade. Preferir destino já disponível que possa receber cópias sem depender de o notebook estar online. Chave de recuperação protegida e acessível ao proprietário fora da VPS; restauração não pode depender de segredo que exista somente no host perdido.
- **D-11:** Snapshots imutáveis e último backup bom preservado; sem sobrescrita nem expurgo automático no v1. Medir crescimento/reserva e sinalizar capacidade insuficiente. Publicar sucesso somente após finalização e conferência; cópia parcial/corrompida mantém falha explícita.
- **D-12:** Estado seguro de último sucesso externo, atraso e motivo de falha no status operacional existente e em recibos sanitizados. O agendamento sozinho não é sucesso. Sem novo painel de gestão nem notificações a terceiros.

### Restauração e aceite real no site e Codex
- **D-13:** Ensaio a partir da cópia efetivamente recuperada do destino externo, em diretório limpo, com chave independente. Conferir SQLite/FK/schema/contagens, busca/FTS, referências e tamanho/SHA de todos os originais declarados disponíveis; manter faltantes explícitos.
- **D-14:** Restore serve consulta offline por padrão e não inicia segundo coletor. Avaliar validade remota da sessão separadamente, somente depois de parar a instância original; QR apenas se a sessão de fato não for válida, sem limpar acervo.
- **D-15:** Conversa real conhecida para localizar orçamento, abrir contexto e conferir anexo no site e Codex, além do ZIP offline do recorte. Comparar referências, autoria, filtros/instantes/fuso, disponibilidade e bytes com SQL/disco/manifesto independentes. Distinguir proposta de confirmação, ausência e limites da cobertura; João é exemplo, não pessoa a fabricar.
- **D-16:** Concluir OPS-01 a OPS-04 somente com evidência real do endpoint permanente, reinício/atualização preservando dados, leitura sem WhatsApp, cópia externa e restauração/fluxo no cliente instalado. Fixtures, QR, URL, processo ativo e relatórios não substituem a prova.

### Discrição do agente
- Descobrir ambiente/acessos existentes sem imprimir segredos; selecionar supervisor/proxy/backend de cópia e criptografia conforme recursos reais. Não fixar produto de backup ou layout de VPS desconhecida nesta discussão.
- Reutilizar mecanismos atuais de snapshot, manifesto, restore e mídia verificada; ampliar apenas o contrato necessário à operação e promoção com coleta exclusiva.
- Definir horário diário, tentativas, reserva/capacidade e janela de parada com recursos medidos. Sem expurgo preventivo, HA, segundo writer ou novos bancos.
- Planejar testes significativos para HTTPS/proxy/Host/Origin spoofing, sessão/cookie/CSRF, bearer ausente/inválido/revogado, caminhos diretos, backup interrompido/corrompido/chave ausente/disco cheio, preservação após update/restart e collector bloqueado em clones.
- Deixar trabalho independente pronto quando um acesso indispensável faltar; registrar a dependência exata sem declarar requisito concluído. Aceite autônomo nos acessos disponíveis não presume confirmação humana.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Escopo e estado
- `AGENTS.md` — autorização, privacidade, exclusividade e workflow.
- `.planning/PROJECT.md` — produto, decisões e baseline local atual.
- `.planning/REQUIREMENTS.md` — OPS-01/02/03/04 e controles transversais.
- `.planning/ROADMAP.md` — fase 4, critérios e dependências de execução.
- `.planning/WINDOWS.md` — WINDOWS13: login web TLS/Origin403 ainda aberto.
- `README.md` — comandos operacionais e limites reais do serviço atual.

### Arquitetura e riscos
- `.planning/research/STACK.md` — runtime/pins e recomendações a revalidar.
- `.planning/research/ARCHITECTURE.md` § Operação e backup recuperável — snapshot coordenado, cópia cifrada, restauração e um único coletor.
- `.planning/research/PITFALLS.md` § 7–10 — capacidade, consistência, privacidade e conteúdo não confiável.

### Baseline e aceite reutilizáveis
- `.planning/phases/03-consulta-e-arquivos-reais-no-codex/03-CONTEXT.md` — decisões de autenticação, consulta e entrega de arquivo.
- `.planning/phases/03-consulta-e-arquivos-reais-no-codex/03-VERIFICATION.md` — prova MCP/cliente real e limites da fase concluída.
- `.planning/phases/03-consulta-e-arquivos-reais-no-codex/03-ACCEPTANCE.md` — SQL/site/Codex/downloads independentes.
- `.planning/phases/03-consulta-e-arquivos-reais-no-codex/03-UAT.md` — cenários autônomos e cleanup.
- `.planning/phases/02-busca-contexto-abas-e-exporta-o-no-site/02-CONTEXT.md` — filtros/fuso/snapshots/abas/ZIP.
- `.planning/phases/01-arquivo-privado-com-mensagens-e-m-dias-reais/01-CONTEXT.md` — backup pré-coleta, retenção e privacidade.

Não há SPEC/ADR externo específico desta fase. As fontes técnicas citadas na pesquisa exigem revalidação; pesquisa anterior não comprova operação permanente.
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/backup.ts`: createSnapshot/validateSnapshot/restoreSnapshot/verifyBackup/preflight/assertCollectorReady; manifesto, SQL/hash, permissão privada, prova HMAC vinculada a perfil/caminho e marcador offlineOnly. Snapshot exige parada/exclusividade; recibo não é portável por mera cópia.
- `src/main.ts`: serviço/CLI, autenticação por superfície, rotas de consulta/exportação/MCP e stop gracioso; middleware atual aceita apenas Host e peer loopback.
- `src/auth.ts`: senha privada, gerações de sessões, CSRF/Origin e cookie; integrar contrato de origem HTTPS com proxy sem enfraquecer loopback.
- `src/whatsapp.ts`: lock Linux boot/PID/starttime, auth transacional, reconexão e gate pré-coleta; trava é local a um diretório/host.
- `src/media.ts`, `src/archive.ts`, `src/export.ts`, `src/mcp.ts`: integridade/stream/restrição, FTS/contexto/proveniência, ZIP integral e bearer/cursors/transferência autenticados.
- `scripts/phase2-acceptance.mjs`, `scripts/phase3-acceptance.mjs` e `test/`: padrões de provas independentes reais, cleanup, backup/recovery/HTTP/auth/readonly/MCP.

### Established Patterns
- Runtime Node24.21.0 do projeto; TypeScript ESM, SQLite e mídia local; dependências fixadas e repositório público com dados/segredos fora do checkout.
- Nenhum mapa em `.planning/codebase/`; scout por símbolos/implementações. Não há deploy/supervisor/backup remoto no código atual observado.
- Snapshot e restore são imutáveis e privados. verify-backup troca senha somente no clone descartável; restore pessoal preserva a senha original.
- Serviço loopback e transporte MCP temporário não são implementação de proxy permanente. Não instalar CA de piloto no sistema.

### Integration Points
- Contrato explícito de origem/proxy confiável entre main/auth/MCP, mantida a validação em todas as superfícies.
- Release, volume persistente, supervisor e rotina de backup no host realmente identificado, com configuração privada externa.
- Orquestração de stop/snapshot/retomada/transferência/recuperação sem mudar a semântica de consulta do acervo.
- Migração com handoff da origem e gate verificável; restauração isolada não recebe coleta automática.
- Configuração persistente do Codex real somente após prova do endpoint HTTPS, preservando outros MCPs e segredo privado.
</code_context>

<specifics>
## Specific Ideas

- O fluxo útil final continua sendo recuperar orçamento e contexto com evidências, no site/Codex e na cópia restaurada.
- A senha/acervo existentes devem seguir utilizáveis; contagens antigas são baseline histórico, não tamanho atual a inventar.
- Sem VPS/domínio/destino externo confirmados nesta discussão; pesquisar acessos disponíveis antes de solicitar intervenção.
</specifics>

<deferred>
## Deferred Ideas

Nenhuma capacidade nova adicionada. Mantidos fora do v1: Claude/OAuth adicional, multiusuário/conta, HA/replicação com writers, importador preventivo, OCR/transcrição/embeddings/chatbot hospedado, envio remoto e painéis extras. Backup online sem parada e política automática de expurgo só por necessidade medida futura.
</deferred>

---
*Phase: 04-opera-o-e-restaura-o-na-vps*
*Context gathered: 2026-10-12*
