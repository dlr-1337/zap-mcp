# Resumo da pesquisa — Zap MCP

**Projeto:** Zap MCP  
**Domínio:** arquivo privado de uma conta pessoal WhatsApp, site e MCP somente leitura  
**Pesquisado em:** 2026-10-10  
**Confiança:** MEDIUM

## Executive Summary

O Zap MCP deve ser um arquivo próprio de mensagens e anexos, consultável mesmo quando a conexão com o WhatsApp cair. Uma conta e um proprietário delimitam o v1: pareamento por QR como dispositivo vinculado sem navegador, busca por contato/texto/período, leitura em várias abas, exportação de mensagens com arquivos reais e consulta autenticada pelo Codex do usuário. A IA interpreta evidências recuperadas; o serviço não precisa de chatbot, transcrição, OCR ou embeddings.

Recomendamos um serviço Node.js 24/TypeScript ESM com Baileys fixado, Express, SQLite FTS5 e mídia em disco privado. Site e MCP usam o mesmo contrato de identidade, autoria, contexto, cobertura e disponibilidade. A primeira entrega deve combinar vínculo, arquivo autenticado mínimo, recuperação após reinício e captura de binários: adiar downloads até terminar a interface pode perder mídia recuperável. Depois vêm busca/abas/exportação, acesso efetivo no Codex e comprovação operacional na VPS.

O risco central é confundir conexão bem-sucedida com recuperação completa. Baileys é integração não oficial e a versão indicada, 7.0.0-rc14, continua prerelease; documentação de v8 em desenvolvimento não comprova release utilizável. Histórico e anexos podem ser parciais, e a divergência documental sobre `isLatest` impede usá-lo como selo de completude. Validar conversas conhecidas na conta real, preservar identidade/proveniência e estados de falha, manter apenas um escritor da sessão e demonstrar restauração do arquivo são condições de aceite, não melhorias opcionais.

## Key Findings

### Recommended Stack

Detalhes e versões documentais em [STACK.md](STACK.md). São recomendações pesquisadas, ainda sem build integrado ou piloto; reconfirmar tags e compatibilidade na implementação.

| Tecnologia | Recomendação e razão |
|---|---|
| Node.js 24 LTS + TypeScript ESM | Um processo residente para conexão, HTTP e streams; versões registradas: 24.21.0 e 7.0.2 |
| Baileys 7.0.0-rc14 fixado | Dispositivo vinculado sem Chromium; validar auth, eventos e PN/LID na tag efetiva; 6.7.24 é legacy e v8 não está comprovado como publicado |
| Express 5 + SDK MCP v2 oficial | Mesmo serviço para site/API e Streamable HTTP; pesquisa registra server 2.3.1, node 2.1.1 e express adapter 2.0.2 |
| better-sqlite3 13 + SQLite FTS5/WAL | Arquivo, índice e fila persistida sem banco remoto; driver exige Node >=22; confirmar FTS5/prebuild na VPS |
| Disco local + streams | Bytes originais privados, temporário e finalização verificada; URLs/miniaturas não equivalem a arquivo |
| APIs nativas de navegador | Busca, contexto e abas sem framework adicional; ZIP por stream com archiver quando implementar exportação |

Reutilizar proxy HTTPS existente e supervisão da VPS; escolher Caddy/systemd se não houver convenção útil. Site usa sessão privada; MCP usa bearer dedicado, revogável e compatível com o Codex real. Não adicionar OAuth/IdP, bridge, Redis, PostgreSQL, S3 ou serviço de IA sem necessidade demonstrada.

### Expected Features

Todos os pedidos F1–F10 de [FEATURES.md](FEATURES.md) pertencem ao MVP:

- **Obrigatórios:** vincular e sincronizar sem navegador; preservar autoria, identidade e respostas citadas; salvar áudio/imagem/vídeo/documento acessíveis; buscar contato/texto/data; abrir contexto em abas; visualizar/baixar originais; exportar mensagens e binários com manifesto; consultar e recuperar arquivo no Codex por MCP autenticado; manter privacidade e backup restaurável.
- **Diferenciais já necessários:** consulta offline do arquivo, evidências iguais no site/export/MCP, limites de cobertura visíveis e anexos binários sob controle do proprietário. Não são expansão de escopo.
- **Adiar:** Claude e sua eventual autenticação específica, favoritos/filtros salvos, importadores e interface para pedir histórico adicional. Solicitações de histórico suportadas podem integrar o piloto, sem promessa de completude.
- **Excluir:** envio/edição/exclusão/marcação de leitura remota, multiusuário/múltiplas contas, CRM, IA paga, OCR, transcrição e embeddings.

Busca cobre texto, legenda e nomes recebidos de arquivos; não o conteúdo falado ou interno de imagens/PDFs. Cada resultado precisa de referência estável, autor, data original/fuso, conversa, alterações observadas, anexos e limites do recorte. Homônimos são candidatos distintos; ausência significa “não encontrado no acervo”.

### Architecture Approach

[ARCHITECTURE.md](ARCHITECTURE.md) converge para um serviço com fronteiras internas, não microserviços. Só o coletor possui o socket WhatsApp; todas as consultas acessam o arquivo local. A mesma projeção segura atende site, exportação e MCP, sem expor credenciais, media keys ou envelope bruto.

1. **Coletor e ingestão:** persistir credenciais e todas as chaves; processar lotes completos e mudanças; manter envelopes privados, aliases PN/LID e upserts transacionais idempotentes.
2. **Arquivo e mídia:** SQLite canônico, FTS5 e fila persistente; streams com concorrência limitada, hash/tamanho e estados recuperáveis; reconciliar arquivo e banco após crash.
3. **Consulta e interfaces:** filtros parametrizados, paginação determinística e janela por mensagem; abas independentes; download autenticado por ID interno; MCP com allowlist de consultas sem socket.
4. **Exportação e recuperação:** recorte consistente, mensagens legíveis/estruturadas, manifesto de arquivos presentes/ausentes e ZIP em stream; backup coordenado de banco, mídia e sessão, restaurável sem WhatsApp conectado.

Não existe transação única entre SQLite e filesystem: gravar temporário, finalizar binário antes de anunciar disponibilidade e reconciliar interrupções. Identidade não é nome, telefone isolado, timestamp ou hash do anexo. Edição/revogação fora de ordem não pode ser anulada por replay antigo; visualização única fica restrita a metadados no v1.

### Critical Pitfalls

Os riscos de [PITFALLS.md](PITFALLS.md) se agrupam em cinco condições de projeto:

1. **Cobertura ou autoria falsa:** distinguir lote concluído de histórico completo; preservar aliases, chave de origem, autor, citações e revisões; comparar amostra conhecida no celular. `isLatest` não prova completude.
2. **Perda/duplicação e sessão quebrada:** persistir todos os itens/chaves, serializar gravações, impedir segundo coletor e testar replay/reconexão/reinício; logout não apaga acervo.
3. **Anexo falso ou perdido por atraso:** capturar bytes cedo em fila limitada; verificar antes de marcar disponível; preservar mensagem quando mídia falha; testar quatro tipos offline e retomada de download interrompido.
4. **Exposição ou mutação indevida:** autenticar QR, dados, mídias, exports e MCP desde a primeira exposição; caminhos internos e conteúdo escapado; nenhuma operação pública de escrita no WhatsApp. Annotations MCP não são controle de acesso; conteúdo arquivado é dado não confiável.
5. **Esgotamento e backup inconsistente:** streaming, reserva de disco e falha explícita; backup coordenado com manifesto; restauração isolada verifica banco, busca e hashes sem iniciar sessão concorrente.

## Implications for Roadmap

### Fase 1: Arquivar e reabrir conversas com anexos reais

**Razão:** provar a fonte antes de construir uma interface completa e começar retenção de mídia enquanto ela ainda está acessível.  
**Entrega:** acesso privado mínimo, QR, sessão durável e exclusiva, ingestão inicial/incremental, leitura básica autenticada do arquivo e download local dos quatro tipos disponíveis; cobertura observada, identidade/autoria/citações, alterações e estados ausentes; reinício e retomada sem duplicação. Preparar snapshot recuperável antes do piloto com dados reais.  
**Atende:** F1–F4, parte mínima de F7/F10.  
**Evita:** falsa completude, PN/LID incorreto, perda de chaves, replay e expiração de mídia enquanto se desenvolve UI. Fila, limites e recuperação de arquivos entram aqui, não em uma fase posterior de infraestrutura.  
**Aceite:** conta real entrega amostra conhecida; mensagem e binários permanecem acessíveis sem WhatsApp; reinício preserva o que foi salvo. Se faltar a conversa essencial, registrar a limitação e decidir viabilidade antes da interface completa.

### Fase 2: Encontrar, comparar e exportar evidências no site

**Razão:** transforma o arquivo validado em fluxo humano completo, usando IDs e arquivos já preservados.  
**Entrega:** busca por contato/texto/período com fuso explícito, janela contextual e citações, abas independentes, previews seguros/download e ZIP do recorte inteiro com mensagens, arquivos e manifesto de faltantes.  
**Atende:** F5–F8, consolida F3/F10.  
**Evita:** homônimos mesclados, páginas instáveis, resultados sem contexto, exportação só da página visível, nomes usados como caminhos e URLs públicas.  
**Aceite:** localizar o João correto e orçamento, comparar conversas em duas abas e exportar recorte verificável offline; acesso sem autenticação falha em todas as rotas.

### Fase 3: Consultar e recuperar arquivos pelo Codex

**Razão:** adaptar o contrato já verificável evita outro índice ou conclusões sem origem. Fazer prova curta de autenticação/entrega binária durante o planejamento, antes de expandir ferramentas.  
**Entrega:** MCP Streamable HTTP com bearer revogável; localizar conversas, pesquisar, ler contexto e recuperar bytes reais de anexo no Codex instalado; limites/cursores, proveniência e cobertura nas respostas.  
**Atende:** F9, reutiliza F3–F5/F7/F10.  
**Evita:** assumir suporte do host a resources/links privados, base64 gigante, vazamento de chaves e escrita escondida sob `readOnlyHint`; conteúdo hostil continua dado.  
**Aceite:** fluxo João/orçamento/contexto/anexo no Codex real, arquivo conferido por bytes/hash e tokens ausente/inválido/revogado recusados; nenhuma consulta marca leitura ou modifica WhatsApp. Claude/OAuth não condicionam o aceite.

### Fase 4: Operar e restaurar o acervo na VPS

**Razão:** comprovar continuidade do conjunto utilizável no ambiente final, sem adiar segurança e persistência das fases anteriores.  
**Entrega:** implantação conforme VPS existente, HTTPS e serviço supervisionado, capacidade medida, backup privado fora da VPS e ensaio de restauração coordenada; arquivo consultável/exportável com coletor desligado.  
**Atende:** F10 e aceite integrado F1–F9.  
**Evita:** ENOSPC silencioso, cópia inconsistente de WAL/mídia/auth, segunda sessão e confusão entre restore do acervo e validade da sessão remota.  
**Aceite:** restaurar em diretório limpo, conferir integridade/contagens/FTS/hashes e consultar pelo site/MCP offline; só testar vínculo restaurado após parar a instância original. Novo QR pode ser necessário sem invalidar restauração do arquivo.

### Phase Ordering Rationale

- As quatro fases entregam capacidades completas; os marcos M1–M6 dos riscos são dependências internas, não seis camadas horizontais do roadmap.
- Retenção binária começa junto da ingestão real; busca/exportação/MCP só apresentam arquivos cuja disponibilidade foi comprovada.
- Proteção, proveniência, leitura efetiva e recuperação após reinício atravessam os incrementos; a última fase comprova operação/restore, não introduz segurança tardiamente.
- Identificar VPS/domínio/disco antes de exposição/piloto é tarefa preparatória da primeira fase quando necessária. Não exige nova infraestrutura nem implantação durante pesquisa.

### Research Flags

- **Fase 1 — precisa de pesquisa focada:** interfaces da tag Baileys fixada, auth/PN-LID, semântica de histórico, política de edições/temporárias e recuperação de mídia; cobertura exige piloto, não mais pesquisa genérica.
- **Fase 3 — precisa de pesquisa focada:** SDK v2 e versão do Codex instalado, configuração privada de bearer e mecanismo aceito para bytes pequenos/grandes. Lista de recursos ou URL retornada não prova entrega.
- **Fase 4 — inspeção específica do ambiente:** CPU/OS, disco, proxy, persistência e destino de backup; testar restore. Não demanda pesquisa ampla de stack.
- **Fase 2 — padrões conhecidos:** SQLite/FTS5, paginação, abas e ZIP; dispensar pesquisa de domínio e testar limites/consistência. Autenticação e backup usam padrões documentados, mas precisam de verificação real.

## Confidence Assessment

| Área | Confiança | Evidência e limite |
|---|---|---|
| Stack | MEDIUM | Fontes de mantenedores e registros cruzados; GSD classificou MEDIUM; versões documentadas não foram compiladas juntas nem testadas na VPS |
| Funcionalidades | MEDIUM | Escopo claro em PROJECT.md; capacidades dependentes de WhatsApp/Codex ainda sem piloto |
| Arquitetura | MEDIUM | Padrões locais documentados; coordenação banco/arquivos, aliases e retorno binário são decisões a validar |
| Riscos | MEDIUM | Eventos, sessão, mídia e avisos upstream fundamentam riscos; impacto na conta/volume e restore não medidos |

**Confiança geral:** MEDIUM. Pesquisa documental concluída; implementação, conta e clientes não validados.

### Gaps to Address

- **Histórico/mídia da conta:** confrontar conversas antigas/recentes e quatro categorias de anexos com o celular; registrar cobertura observada, sem duração/percentual inventado. Help do WhatsApp teve acesso incompleto nas pesquisas.
- **Baileys efetivo:** reconfirmar release/tag, assinaturas, serialização e correções antes da instalação; guia v8/master não substitui rc14. A pesquisa identifica correção conhecida de spoofing em 6.7.22/7.0.0-rc12; versão nova continua exigindo avaliação.
- **Política de versões/temporárias:** definir retenção local explícita antes da ingestão, diferenciar estado atual e eventos preservados; não contornar visualização única.
- **Codex:** confirmar versão, negociação MCP e recebimento efetivo de binários autenticados; não ampliar OAuth/Claude por antecipação.
- **VPS e recuperação:** identificar domínio, recursos, proxy, destino cifrado de backup e chave recuperável; medir fila/disco e testar ENOSPC/restore sem coletor concorrente.

## Sources

Síntese de [STACK.md](STACK.md), [FEATURES.md](FEATURES.md), [ARCHITECTURE.md](ARCHITECTURE.md) e [PITFALLS.md](PITFALLS.md), pesquisados em 2026-10-10, com escopo de [PROJECT.md](../PROJECT.md). Não houve nova pesquisa externa nesta síntese.

### Primárias — base documental, confiança aplicada MEDIUM

- [Baileys releases](https://github.com/WhiskeySockets/Baileys/releases), [migração v7](https://baileys.wiki/migration/v7), [v8 em desenvolvimento](https://baileys.wiki/migration/v8) — versão, PN/LID e limites de exemplos atuais.
- [Histórico Baileys](https://baileys.wiki/advanced/history-sync), [sessão](https://baileys.wiki/authentication/session-management), [README da rc14](https://github.com/WhiskeySockets/Baileys/blob/v7.0.0-rc14/README.md) — vínculo, persistência e mídia; conferir implementação na tag.
- [Aviso de segurança Baileys](https://github.com/WhiskeySockets/Baileys/security/advisories/GHSA-qvv5-jq5g-4cgg) — correção conhecida de spoofing, sem garantia geral de autenticidade.
- [Node.js](https://nodejs.org/dist/index.json), [better-sqlite3](https://github.com/WiseLibs/better-sqlite3/releases), [FTS5](https://www.sqlite.org/fts5.html), [WAL](https://www.sqlite.org/wal.html), [backup SQLite](https://www.sqlite.org/backup.html) — runtime, busca e consistência.
- [SDK MCP v2](https://ts.sdk.modelcontextprotocol.io/v2/), [transporte MCP](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http), [tools](https://modelcontextprotocol.io/specification/2026-07-28/server/tools), [resources](https://modelcontextprotocol.io/specification/2026-07-28/server/resources) — protocolo, consultas e anexos; compatibilidade real do host pendente.
- [Codex MCP](https://learn.chatgpt.com/docs/extend/mcp?surface=cli) — configuração documentada; aceite precisa do desktop instalado.
- Context7 `/whiskeysockets/baileys.wiki-site` e `/modelcontextprotocol/typescript-sdk` — orientação cruzada com fontes de mantenedores, não prova de piloto.

### Limites e inferências

- [WhatsApp: histórico em dispositivos vinculados](https://faq.whatsapp.com/653480766448040/) — acesso parcial/indireto; LOW para cobertura quantitativa, nenhuma janela de retenção adotada.
- [Processamento Baileys em master](https://github.com/WhiskeySockets/Baileys/blob/master/src/Utils/process-message.ts) — divergência `isLatest` e eventos motivam confirmação na versão instalada; master não certifica a tag.
- Ordem das fases, fila local, envelope compartilhado e backup coordenado são síntese de engenharia; precisam dos testes observáveis descritos acima.

---
*Pesquisa consolidada: 2026-10-10*  
*Pronto para requisitos e roadmap: sim; aceite técnico pendente de implementação e piloto.*
