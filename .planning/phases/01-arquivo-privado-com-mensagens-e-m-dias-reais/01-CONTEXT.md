# Phase 1: Arquivo privado com mensagens e mídias reais - Context

**Gathered:** 2026-10-10
**Status:** Ready for planning
**Modo:** `1 --all --auto`; decisões operacionais escolhidas pelo agente conforme a autorização, sem respostas individuais do usuário.

<domain>
## Phase Boundary

Vincular uma conta pessoal sem navegador, arquivar mensagens e originais acessíveis em armazenamento privado durável e permitir leitura básica autenticada, inclusive com o coletor desconectado. Inclui proteção de dados e QR, sessão persistente exclusiva, ingestão histórica/incremental, proveniência, alterações e cobertura observadas, fila de mídia recuperável e piloto real após cópia privada recuperável.

Responsabilidade desta fase: PRIV-01/02/03, SYNC-01 a SYNC-07, EVID-01, MEDIA-01/02/03 e WEB-01. Busca combinada, contexto de resultados, abas, preview completo e exportação pertencem à fase 2; MCP à fase 3; operação e restauração completas na VPS à fase 4. Datas originais já devem ser preservadas, sem antecipar filtros da fase 2.
</domain>

<decisions>
## Implementation Decisions

### Decisões anteriores mantidas
- Uma conta, um proprietário e um coletor; somente leitura no WhatsApp e nenhuma confirmação de leitura oferecida por qualquer interface.
- Acervo local é a fonte de consulta; queda do WhatsApp impede novas capturas, sem impedir acesso ao material persistido.
- Um serviço Node.js/TypeScript ESM, Express, SQLite e arquivos privados é a direção pesquisada. Baileys fixado precisa de revalidação de release, correções e APIs antes da instalação; recomendação anterior não comprova compatibilidade.
- Todas as categorias de chaves e credenciais precisam de persistência transacional; `useMultiFileAuthState` não será armazenamento de produção.
- Conteúdo recebido é dado não confiável. Não expor sessão, chaves de mídia, envelopes brutos, caminhos internos ou segredos em interfaces, Git, logs ou evidências públicas.

### Entrada privada do proprietário
- **D-01:** Senha local de um proprietário, sem cadastro público ou IdP adicional.
- **D-02:** Sessão de navegador privada e revogável no servidor, sem credencial em URL ou armazenamento acessível ao conteúdo das conversas.
- **D-03:** Invalidar a sessão do site; manter o coletor e o acervo. Sair do site não desvincula o WhatsApp.
- **D-04:** Redefinição operacional local com acesso autorizado ao host; sem recuperação por e-mail nem painel de usuários no v1.

### QR e reconexão
- **D-05:** Somente na tela autenticada, com validade atual e instrução de ler em Dispositivos conectados no celular; nunca em logs.
- **D-06:** Distinguir aguardando pareamento, conectando, conectado, reconectando, desconectado e sessão inválida, sem associar conectado a histórico completo.
- **D-07:** Reconectar automaticamente com espera e tentativas limitadas; pedir novo QR apenas quando a sessão de fato deixar de ser válida.
- **D-08:** Conservar mensagens e anexos e explicar a necessidade de novo pareamento; nunca limpar acervo para reconectar.

### Cobertura, alterações e conteúdo temporário
- **D-09:** Receber todo histórico disponibilizado pelo vínculo, sem recorte local arbitrário nem promessa de janela integral; pedidos extras só se suportados e necessários ao piloto.
- **D-10:** Conservar localmente por prazo indeterminado o material efetivamente capturado e revisões/revogações observadas, distinguindo estado atual e registro anterior; sem expurgo automático no v1.
- **D-11:** Não contornar restrições: temporárias recebidas normalmente podem ser arquivadas com indicação; visualização única fica em metadados e indisponibilidade, sem abrir ou baixar por bypass.
- **D-12:** Mostrar última ingestão, intervalo de instantes observados, lotes e falhas; usar não encontrado no acervo e separar lote concluído de cobertura da conta.

### Anexos, fila e falta de espaço
- **D-13:** Bytes originais disponíveis dos quatro tipos, desde a ingestão, mantendo legenda/nome recebidos e sem transcodificação preventiva.
- **D-14:** Distinguir pendente, disponível verificado, falha recuperável e indisponível, com motivo seguro e tentativas; falha não esconde a mensagem.
- **D-15:** Recuperar fila persistente, reconciliar temporários e arquivos finais e repetir downloads recuperáveis com concorrência e tentativas limitadas; sem painel extra de gerenciamento.
- **D-16:** Pausar downloads e sinalizar falta de espaço; preservar binários e mensagens já gravados, admitir que falha de ingestão não foi arquivada e nunca apagar automaticamente para liberar espaço.

### Leitura básica e aceite do piloto
- **D-17:** Interface simples com estado de conexão, lista de conversas, uma conversa por vez, mensagens e acesso privado ao original disponível; leitura limitada e ordenada sem carregar todo o acervo.
- **D-18:** Autor/direção, data original em America/Sao_Paulo, referência, tipo, texto/legenda, citação recebida, alterações e estados de anexo; campos desconhecidos explícitos e homônimos distintos.
- **D-19:** Só após preparar e conferir cópia privada recuperável e exclusividade do coletor; manter consulta sem coletor para testes e restauração.
- **D-20:** Comparar conversa conhecida e exemplos reais acessíveis dos quatro tipos com o celular, incluir grupo/direção recebida-enviada, testar leitura offline e reinício; falta de acesso, QR ou amostra mantém aceite pendente.

### Discrição do agente
- Escolher estrutura de módulos, schema/migrações, biblioteca mínima de sessão/QR, layout e números iniciais de fila/tentativas/reserva de disco com base na pesquisa da versão real e recursos medidos; registrar limites efetivos sem criar telas extras.
- Login e transporte devem falhar fechados. Acesso direto por ID/URL também exige autenticação; downloads usam identificadores internos seguros e saída de conteúdo protegida. O planejador especifica os testes correspondentes.
- Reutilizar proxy/supervisão existentes após identificar o ambiente. Desenvolver e testar localmente enquanto VPS/domínio não estiverem identificados; não substituir evidência real por simulação.
- Sessão válida deve sobreviver a reinícios; divergência entre banco/filesystem exige reconciliação, e a instância de restauração nunca inicia outro coletor automaticamente.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Escopo e aceite
- `AGENTS.md` — autonomia, privacidade, restrições e workflow do projeto.
- `.planning/PROJECT.md` — produto, decisões do usuário, uma conta/proprietário e Codex como cliente obrigatório.
- `.planning/REQUIREMENTS.md` — requisitos da fase e evidências observáveis; planejamento não conclui requisito.
- `.planning/ROADMAP.md` — Phase 1, cinco critérios de sucesso, limites entre fases e condições anteriores ao piloto.

### Pesquisa e riscos
- `.planning/research/SUMMARY.md` — síntese, confiança e incertezas abertas.
- `.planning/research/STACK.md` — direção técnica e versões que devem ser verificadas novamente.
- `.planning/research/ARCHITECTURE.md` — fronteira do coletor, persistência, mídia e projeção segura comum.
- `.planning/research/PITFALLS.md` — cobertura parcial, identidade PN/LID, replay, chaves, privacidade, disco e backup.
- `.planning/research/FEATURES.md` — capacidades v1 e limites de pesquisa/consulta.

Não há SPEC/ADR externo específico desta fase. As URLs técnicas citadas na pesquisa exigem consulta à fonte/tag efetiva pelo pesquisador; não são evidência de operação.
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Ainda não há código, dependências instaladas, testes, componentes, rotas ou maps em `.planning/codebase/`.
- `.gitignore` já exclui dependências, build, configuração privada, banco, mídia, sessão, exportações e backups; novos arquivos privados precisam continuar fora do Git.
- `README.md`, `AGENTS.md` e os documentos `.planning/` são os ativos existentes, sem produto funcional.

### Established Patterns
- Planejamento versionado no ramo `main`; repositório público, dados reais privados.
- GSD em `yolo`, modelo herdado, avanço automático, pesquisa/verificação/TDD proporcionais e controles visuais habilitados.
- Preservar instantes e identidade desde a ingestão; nome exibido não define a identidade. Layout simples com APIs nativas de navegador é a direção pesquisada.

### Integration Points
- Novo serviço terá coletor isolado da interface de consulta e download; fases futuras reutilizarão o arquivo e projeção segura.
- Diretório persistente privado e backup pertencem ao ambiente operacional, não ao pacote público de fonte.
- Nenhum acesso à VPS, domínio ou sessão real foi comprovado por esta discussão; o planejador deve tornar essas dependências explícitas.
</code_context>

<specifics>
## Specific Ideas

- Uso original: ler conversa com João, localizar orçamento e conferir o combinado; o fluxo completo é aceite posterior, sem antecipar busca/abas/MCP na fase 1.
- Distinguir conexão, progresso de lote e cobertura observada. Usar “não encontrado no acervo” e nunca “não existiu” ou “histórico completo”.
- O celular do proprietário é necessário para ler o QR e confirmar uma conversa conhecida. Não enviar mensagens pelo Zap MCP para fabricar evidência de captura.
- Se a conversa ou mídia essencial não vier da fonte, registrar lacuna e resolver a viabilidade antes de ampliar a interface. Não construir importador preventivo.
</specifics>

<deferred>
## Deferred Ideas

Nenhuma capacidade nova adicionada. Mantidas as separações do roadmap:
- Fase 2: busca/período/contexto/abas, preview completo e ZIP de exportação.
- Fase 3: MCP e entrega binária efetiva no Codex instalado.
- Fase 4: supervisão/HTTPS final, backup recorrente fora da VPS e restauração/aceite completo.
- V2: Claude e importador apenas se uma lacuna real essencial justificar.
- Sem envio, exclusão remota, OCR, transcrição, embeddings, IA hospedada, múltiplas contas ou IdP preventivo.
</deferred>

---
*Phase: 01-arquivo-privado-com-mensagens-e-m-dias-reais*
*Context gathered: 2026-10-10*
