# Phase 4: Operação e restauração na VPS - Discussion Log

> **Audit trail only.** Não usar como entrada de pesquisa/planejamento/execução; decisões em 04-CONTEXT.md.

**Date:** 2026-10-12
**Phase:** 04-opera-o-e-restaura-o-na-vps
**Modo:** `4 --all --auto`; escolhas recomendadas do agente, sem respostas individuais do usuário.
**Areas discussed:** Endpoint HTTPS e acesso privado; Migração, persistência e coletor exclusivo; Backup externo, frequência e chave; Restauração e aceite real no site e Codex

---

## Endpoint HTTPS e acesso privado

### D-01: Onde implantar?

| Opção | Selecionada |
|---|---|
| Reutilizar VPS/domínio/proxy disponíveis após inventário | Sim — recomendação adotada em --auto |
| Criar infraestrutura nova |  |

**[auto] Seleção do agente:** Reutilizar VPS/domínio/proxy disponíveis após inventário.
**Rationale:** A identidade do ambiente e a capacidade ainda precisam de prova; nenhuma contratação implícita.

### D-02: Como acessar site e MCP?

| Opção | Selecionada |
|---|---|
| Uma origem HTTPS explícita e backend privado | Sim — recomendação adotada em --auto |
| Expor a porta Node diretamente |  |

**[auto] Seleção do agente:** Uma origem HTTPS explícita e backend privado.
**Rationale:** Host/Origin/proxy confiável, CSRF e cookie seguro precisam funcionar juntos; resolver WINDOWS13.

### D-03: Como preservar o acesso do proprietário?

| Opção | Selecionada |
|---|---|
| Preservar senha e identidade; credencial MCP exclusiva no destino | Sim — recomendação adotada em --auto |
| Recriar usuário e acervo |  |

**[auto] Seleção do agente:** Preservar senha e identidade; credencial MCP exclusiva no destino.
**Rationale:** Evitar perda de IDs e tokens do piloto; invalidar sessões transitórias sem sobrescrever outros MCPs.

### D-04: Como supervisionar?

| Opção | Selecionada |
|---|---|
| Reutilizar supervisor, separar saúde do acervo e conexão WhatsApp | Sim — recomendação adotada em --auto |
| Considerar processo ativo prova de funcionamento |  |

**[auto] Seleção do agente:** Reutilizar supervisor, separar saúde do acervo e conexão WhatsApp.
**Rationale:** Conexão indisponível não deve derrubar consulta; status e falhas sem conteúdo privado.

## Migração, persistência e coletor exclusivo

### D-05: O que levar para a VPS?

| Opção | Selecionada |
|---|---|
| Acervo real em snapshot consistente e conferido | Sim — recomendação adotada em --auto |
| Perfil vazio com novo pareamento |  |

**[auto] Seleção do agente:** Acervo real em snapshot consistente e conferido.
**Rationale:** Preservar mensagens, referências, índices, originais, senha e estado de sessão; guardar fallback privado.

### D-06: Como transferir a coleta?

| Opção | Selecionada |
|---|---|
| Parar origem antes de habilitar único destino verificado | Sim — recomendação adotada em --auto |
| Deixar os dois coletores ativos durante migração |  |

**[auto] Seleção do agente:** Parar origem antes de habilitar único destino verificado.
**Rationale:** Lock local não impede duas máquinas; handoff precisa conferir supervisor da origem e destino.

### D-07: Onde persistir?

| Opção | Selecionada |
|---|---|
| Diretório/volume privado estável fora do release, usuário dedicado | Sim — recomendação adotada em --auto |
| Dados dentro do checkout ou container efêmero |  |

**[auto] Seleção do agente:** Diretório/volume privado estável fora do release, usuário dedicado.
**Rationale:** Medir espaço para acervo, snapshot, restore e ZIP; privilégios mínimos.

### D-08: Como atualizar e recuperar falha?

| Opção | Selecionada |
|---|---|
| Backup conferido antes e release recuperável sem apagar acervo | Sim — recomendação adotada em --auto |
| Atualização automática de dependências e reset |  |

**[auto] Seleção do agente:** Backup conferido antes e release recuperável sem apagar acervo.
**Rationale:** Pins validados mantidos; fallback considera schema novo e impede coletor duplicado.

## Backup externo, frequência e chave

### D-09: Quando copiar?

| Opção | Selecionada |
|---|---|
| Diariamente e antes de migração/atualização, parada curta coordenada | Sim — recomendação adotada em --auto |
| Somente quando houver problema |  |

**[auto] Seleção do agente:** Diariamente e antes de migração/atualização, parada curta coordenada.
**Rationale:** Objetivo inicial RPO24h, sem afirmar SLA; retomar o serviço mesmo se cópia/transferência falhar.

### D-10: O que comprova backup fora da VPS?

| Opção | Selecionada |
|---|---|
| Cópia cifrada recuperada do destino e chave independente | Sim — recomendação adotada em --auto |
| Arquivo adicional no mesmo disco da VPS |  |

**[auto] Seleção do agente:** Cópia cifrada recuperada do destino e chave independente.
**Rationale:** Preferir destino já disponível que funcione sem notebook online; chave privada recuperável fora da VPS.

### D-11: Como reter?

| Opção | Selecionada |
|---|---|
| Snapshots imutáveis, preservar último bom e sem expurgo automático v1 | Sim — recomendação adotada em --auto |
| Sobrescrever sempre uma única cópia |  |

**[auto] Seleção do agente:** Snapshots imutáveis, preservar último bom e sem expurgo automático v1.
**Rationale:** Medir crescimento/capacidade; falha parcial não vira backup concluído nem remove cópia anterior.

### D-12: Como perceber falha?

| Opção | Selecionada |
|---|---|
| Estado seguro de último sucesso externo, atraso e falha | Sim — recomendação adotada em --auto |
| Apenas agendamento sem conferir execução |  |

**[auto] Seleção do agente:** Estado seguro de último sucesso externo, atraso e falha.
**Rationale:** Exibir ao proprietário em status existente e recibos; sem novo painel ou mensagens a terceiros.

## Restauração e aceite real no site e Codex

### D-13: De onde restaurar no ensaio?

| Opção | Selecionada |
|---|---|
| Recuperar backup externo para diretório limpo e conferir tudo | Sim — recomendação adotada em --auto |
| Reabrir apenas cópia local conhecida |  |

**[auto] Seleção do agente:** Recuperar backup externo para diretório limpo e conferir tudo.
**Rationale:** Conferir SQL/FK/schema/contagens/FTS/referências/hash de todos originais; chave acessível sem depender da VPS.

### D-14: Como tratar a sessão restaurada?

| Opção | Selecionada |
|---|---|
| Consulta offline por padrão; eventual promoção controlada após parar origem | Sim — recomendação adotada em --auto |
| Iniciar coletor automaticamente no restore |  |

**[auto] Seleção do agente:** Consulta offline por padrão; eventual promoção controlada após parar origem.
**Rationale:** Não apagar restored.json como bypass; validade remota é teste separado e QR só se sessão inválida.

### D-15: Qual o fluxo final?

| Opção | Selecionada |
|---|---|
| Conversa real conhecida: orçamento, contexto, anexo e ZIP no site/Codex | Sim — recomendação adotada em --auto |
| Fixtures, QR ou URL como aceite |  |

**[auto] Seleção do agente:** Conversa real conhecida: orçamento, contexto, anexo e ZIP no site/Codex.
**Rationale:** Comparar mesmas referências/instantes/autoria/filtros e bytes; separar proposta, confirmação e ausência no acervo.

### D-16: Quando concluir OPS-01 a OPS-04?

| Opção | Selecionada |
|---|---|
| Após evidência real por requisito no endpoint permanente e restore | Sim — recomendação adotada em --auto |
| Após documentos e testes locais |  |

**[auto] Seleção do agente:** Após evidência real por requisito no endpoint permanente e restore.
**Rationale:** Cobrir autenticação/TLS/negações/restart/update/offline/backup/restore; falta de acesso mantém requisito pendente.

## Discrição do agente

Inventariar acessos e recursos; selecionar supervisor/proxy/criptografia/destino já disponível; medir reserva/janela/horário e implementar somente os controles operacionais necessários. Não criar contratação, inventar host, rotular testes locais como VPS ou pedir confirmação de escolha operacional já autorizada.

## Deferred Ideas

Nenhuma nova ideia fora do escopo incorporada. Claude, HA, multiusuário, IA hospedada, backup online/expurgo preventivo e envio remoto permanecem fora do v1.
