# Riscos de implementação — Zap MCP

**Domínio:** arquivo pessoal de uma conta WhatsApp, dispositivo vinculado sem navegador, VPS privada, site e MCP somente leitura no Codex do proprietário.
**Pesquisado:** 2026-10-10.
**Confiança geral:** MEDIUM. O classificador GSD retornou MEDIUM para Context7 e websearch verificado contra fontes oficiais. Recomendações e testes abaixo são inferências de engenharia; não comprovam comportamento na conta real. A página oficial de histórico do WhatsApp não entregou texto legível, portanto nenhuma duração ou porcentagem de cobertura foi deduzida dela.

Os marcos abaixo são capacidades lógicas para o roadmap: **M1 vínculo e persistência**, **M2 ingestão e identidade**, **M3 mídias binárias**, **M4 site e exportação privados**, **M5 MCP no Codex**, **M6 operação e restauração**. Integridade e privacidade começam em M1; M6 apenas comprova o conjunto.

## Riscos críticos

### 1. Declarar histórico completo após conectar ou receber um lote

**Falha e causa:** socket conectado, `syncFullHistory`, progresso 100% ou conclusão de um tipo de sincronização não demonstram que todas as mensagens da conta foram recuperadas. O histórico chega em lotes e pode exigir busca adicional. A documentação de eventos descreve `isLatest` como conclusão; o código atual de processamento o calcula a partir da ausência de histórico previamente processado. Essa divergência impede usá-lo sozinho como prova. [Histórico](https://baileys.wiki/advanced/history-sync), [eventos](https://baileys.wiki/concepts/events), [processamento atual](https://github.com/WhiskeySockets/Baileys/blob/master/src/Utils/process-message.ts).

**Prevenção:** guardar tipo, origem, horário e progresso dos lotes; distinguir conectado, recebendo, pausado e lote concluído. Mostrar período observado por conversa, falhas e pedidos adicionais tentados. Mesclar lotes; não apagar registros porque ficaram ausentes em outro lote. Conferir a semântica na tag instalada. Nenhum resultado vazio deve virar afirmação de que a conversa nunca existiu.

**Teste observável:** confrontar mensagens antigas, recentes e anexos de conversas conhecidas no celular com o arquivo; interromper o sync e verificar que a interface relata cobertura parcial. Conclusão de um lote não elimina esse aviso global.

**Marco:** M1 prova da integração, M2 armazenamento, M4/M5 comunicação de cobertura. **Confiança:** MEDIUM; cobertura efetiva pendente da conta real.

### 2. Usar telefone ou nome como identidade definitiva

**Falha e causa:** um contato vira duas conversas, mensagens são atribuídas ao participante errado ou um LID sem número desaparece da busca. Baileys distingue JIDs de telefone e LIDs; campos alternativos e mapeamentos podem chegar posteriormente. O lookup reverso não encontra números desconhecidos por mágica. [Migração v7](https://baileys.wiki/migration/v7), [JIDs](https://baileys.wiki/concepts/jids).

**Prevenção:** identidade interna estável e aliases explícitos para JIDs observados; preservar `remoteJid`, `remoteJidAlt`, `participant`, `participantAlt` e autoria original. Usar mapeamentos recebidos, nunca união por nome nem conversão de LID em telefone. Registrar identidades ainda não resolvidas. Reconciliar aliases também em referências de respostas e anexos.

**Teste observável:** ingerir a mesma conversa primeiro por PN e depois por LID, acrescentar o mapeamento atrasado e verificar uma conversa com autoria correta. Dois participantes com mesmo nome continuam distintos; um LID sem PN permanece consultável.

**Marco:** M2 antes de busca e exportação. **Confiança:** MEDIUM.

### 3. Duplicar ou perder dados ao reconectar

**Falha e causa:** escutar apenas `notify`, salvar apenas a primeira mensagem do array, usar timestamp como chave ou cadastrar listeners repetidos. Histórico, `append` e tráfego ao vivo precisam alcançar o mesmo armazenamento. O evento pode conter várias mensagens. [Eventos](https://baileys.wiki/concepts/events), [tipos atuais](https://github.com/WhiskeySockets/Baileys/blob/master/src/Types/Events.ts).

**Prevenção:** processar cada item dos lotes; chave composta que respeite conversa, ID e identidade do remetente/`fromMe`, com aliases reconciliados. Fazer merge transacional idempotente e proteger conteúdo mais recente contra replay antigo. Persistir envelope recebido com tipo do evento, versão do parser e timestamps; usar serialização que preserve buffers e valores de protocolo. O payload é o objeto entregue pela biblioteca, não uma alegação de captura integral do tráfego.

**Teste observável:** repetir lotes em ordem diferente, interromper entre gravações e reconectar três vezes: mesmos registros e anexos lógicos, sem perder itens. Fixture com buffers e timestamp deve sobreviver à serialização e reconstruir `getMessage`.

**Marco:** M2; repetir no ensaio M6. **Confiança:** MEDIUM.

### 4. Tratar mensagens editadas, revogadas ou temporárias como texto imutável

**Falha e causa:** resposta de orçamento cita valor ultrapassado, replay ressuscita mensagem revogada ou limpeza de chat remove o acervo inteiro. O processamento atual emite atualizações para edição e revogação; eventos de exclusão também existem. [Processamento](https://github.com/WhiskeySockets/Baileys/blob/master/src/Utils/process-message.ts), [tipos de eventos](https://github.com/WhiskeySockets/Baileys/blob/master/src/Types/Events.ts).

**Prevenção:** separar eventos preservados de projeção atual; aplicar edição/revogação de forma idempotente, inclusive quando chegam antes do original. Exibir marcas de edição, revogação e expiração. Não executar exclusão em cascata do arquivo ao receber remoção de chat. Para visualização única, registrar apenas metadados/indisponibilidade no v1, sem abrir ou contornar a restrição. Para temporárias, registrar política e estados recebidos; jamais prometer recuperação após expiração nem apresentar conteúdo antigo como versão atual. Preservação local de conteúdo já recebido deve estar explicitada na política do arquivo.

**Teste observável:** original → edição → revogação → replay do original; estado final permanece revogado. Atualização antes do original não se perde. Fixture de visualização única não cria download nem dispara leitura; temporária expirada aparece sinalizada.

**Marco:** M2 semântica; M3 exclusões de download; M4/M5 apresentação. **Confiança:** MEDIUM para eventos; limites reais de entrega temporária exigem validação.

### 5. Persistir só credenciais ou manter dois escritores da mesma sessão

**Falha e causa:** reinício exige outro QR, mensagens deixam de descriptografar ou duas instâncias disputam a sessão. Auth inclui credenciais e chaves Signal; `keys.set` precisa persistir antes de resolver. A documentação desaconselha `useMultiFileAuthState` em produção. [Gestão de sessão](https://baileys.wiki/authentication/session-management).

**Prevenção:** armazenamento durável de credenciais e de todos os tipos de chaves da versão escolhida, com serialização correta e gravações serializadas. Um coletor ativo por conta, bloqueio de segunda instância e remoção dos listeners antigos no reconnect. Distinguir falha transitória de logout/revogação: retentativa com espera limitada para a primeira, estado “novo vínculo necessário” para a segunda. Não apagar o arquivo ao invalidar auth. QR e chaves nunca entram em logs ou exportações.

**Teste observável:** encerrar e reiniciar após atualização de chaves, receber mensagem sem novo pareamento; segunda instância é recusada. Revogar o dispositivo pelo celular: coletor para de insistir e o site ainda consulta o arquivo.

**Marco:** M1; ensaio de reinício em M6. **Confiança:** MEDIUM.

### 6. Guardar URL ou miniatura e chamar isso de mídia arquivada

**Falha e causa:** o registro aponta para arquivo expirado; download incompleto parece salvo. Baileys oferece stream e solicitação de reenvio após falhas de mídia antiga, mas algum dispositivo precisa conservar o original. Isso é recuperação de protocolo, não envio de mensagem pelo usuário. [Mídias](https://baileys.wiki/messaging/media-messages), [utilitários](https://github.com/WhiskeySockets/Baileys/blob/master/src/Utils/messages.ts).

**Prevenção:** estados separados `pendente`, `baixando`, `disponível`, `falha recuperável`, `indisponível` e `restrito`, com motivo e tentativas. Stream para arquivo temporário; aguardar conclusão, conferir tamanho/hash local, renomear e então marcar disponível. Registrar referência binária local e MIME; não confundir thumbnail com original. Solicitação de reenvio deve ter timeout e tentativas limitadas, sem mandar texto ao contato. Continuar exibindo mensagem e legenda quando a mídia não puder ser obtida.

**Teste observável:** baixar áudio, imagem, vídeo e documento, desconectar o WhatsApp e abrir os quatro arquivos da VPS. Simular 404/410, recuperação com reenvio e falha definitiva; arquivo parcial nunca vira disponível.

**Marco:** M3 antes de previews/exportação/MCP. **Confiança:** MEDIUM; disponibilidade de anexos antigos é uma lacuna da conta real.

### 7. Esgotar RAM ou disco no primeiro histórico

**Falha e causa:** disparar download para cada mensagem de um lote, carregar vídeos como buffers e gerar ZIP inteiro em memória. O volume de uma conta pessoal já pode exceder uma VPS pequena; não depende de muitos usuários.

**Prevenção:** fila persistente e concorrência limitada; streaming, timeout, limite de bytes por tarefa e reserva de espaço para banco/auth. Limitar tamanho exige estado explícito “não baixado por limite”, sem descartar silenciosamente. Pausar downloads antes de consumir a reserva. Se a persistência do banco/auth falhar, parar ingestão com erro visível; não confirmar processamento bem-sucedido nem prometer replay de dados que nunca foram gravados. Remover somente temporários controlados. Dimensionar limites após identificar a VPS.

**Teste observável:** lote grande com mídia pesada, download interrompido e ENOSPC: RAM permanece limitada, não há registros falsamente disponíveis e consultas já persistidas continuam utilizáveis quando o armazenamento permite. Liberar espaço, reiniciar e retomar tarefas sem duplicar; registrar eventual lacuna do período de falha.

**Marco:** M3 fila; M4 exportação por stream; M6 capacidade. **Confiança:** MEDIUM para mecanismo de streams [documentado](https://baileys.wiki/messaging/media-messages); limites são decisões a medir.

### 8. Fazer backup de banco, anexos e sessão em momentos incompatíveis

**Falha e causa:** restaurar referências sem os binários, copiar um banco aberto de forma inconsistente ou reativar uma sessão antiga simultaneamente à original. A API de backup do SQLite cria snapshot consistente do banco, mas isso não torna uma cópia independente de anexos/auth automaticamente consistente. [Backup SQLite](https://www.sqlite.org/backup.html).

**Prevenção:** no v1, pausar coletor e downloads para checkpoint/backup coordenado; ou usar snapshot de banco com manifesto dos arquivos já finalizados. Incluir versão de schema, hashes e auth consistente; proteger a cópia fora da VPS. Não fazer coleta concorrente durante restore. Auth restaurado pode exigir novo QR; recuperar consulta do acervo não pode depender da validade da sessão.

**Teste observável:** restaurar em diretório limpo, com coletor desabilitado: integridade do banco, contagens, busca e hashes de anexos conferem. Consultar e exportar sem rede WhatsApp; só depois testar uma única instância vinculada.

**Marco:** preparar persistência em M1/M3; comprovar M6. **Confiança:** MEDIUM; estratégia recomendada é inferência.

### 9. Proteger a página inicial e deixar anexos, exports ou operações expostos

**Falha e causa:** URL adivinhável revela acervo; nome enviado pelo contato vira caminho na VPS; MCP com `readOnlyHint` ainda chama operações mutáveis. A especificação MCP define annotations como dicas, não garantias. [Schema MCP 2026-07-28](https://modelcontextprotocol.io/specification/2026-07-28/schema).

**Prevenção:** autenticar busca, contexto, mídia, miniaturas, exportações e MCP; dados fora da pasta pública e caches compartilhados. Caminhos vêm de IDs internos gerados, nunca de filename, JID ou parâmetro de caminho externo; filename é só metadado sanitizado. Conteúdo ativo recebido, como HTML/SVG, é download ou preview isolado, sem execução na origem privada. Site e dispatcher MCP oferecem uma lista fechada de consultas: nenhum `send`, `edit`, `delete`, `markRead`, `readMessages`, SQL livre ou acesso arbitrário a arquivos. O módulo de consultas não recebe socket WhatsApp; leitura local não marca chat como lido. Auth, sync e recuperação de mídia de protocolo continuam permitidos no coletor.

**Teste observável:** sem credenciais ou com token inválido, testar cada superfície de dados. Tentativas de traversal, filename malicioso e exportação direta falham. Chamar operações proibidas por HTTP e MCP falha antes do socket; abrir conversa/baixar anexo não chama leitura remota. Validar MCP no Codex do proprietário com autenticação simples compatível, sem tornar OAuth/IdP ou Claude requisitos.

**Marco:** M1 isolamento de segredos; M3 arquivos; M4/M5 acessos. **Confiança:** MEDIUM para MCP; controles são decisões de implementação.

### 10. Aceitar conteúdo arquivado como instrução ou prova infalível

**Falha e causa:** mensagem tenta instruir o Codex a expor outros chats ou executar comandos; título/legenda vira HTML; arquivo bruto inclui chaves de mídia retornadas à IA sem necessidade. Além da injeção textual, houve falha upstream de spoofing de mensagem/histórico e corrupção do app state: **CVE-2026-48063**, corrigida em **6.7.22 / 7.0.0-rc12**. [Aviso do mantenedor](https://github.com/WhiskeySockets/Baileys/security/advisories/GHSA-qvv5-jq5g-4cgg), [release de correção](https://github.com/WhiskeySockets/Baileys/releases/tag/v7.0.0-rc12).

**Prevenção:** retornar texto e anexos como dados citáveis com conversa, autor, horário, ID e estado; separar instruções fixas da ferramenta do conteúdo recebido. Escapar a renderização; não autoabrir URLs nem executar anexos. MCP entrega campos necessários à consulta, sem auth, payload interno completo ou chaves de mídia. Escolher versão corrigida e fixada, preservar origem/versão dos eventos, revisar release notes antes de atualizar. Uma anotação de “conteúdo não confiável” ajuda, mas não garante comportamento do modelo; limite consultas e não permita que conteúdo invente operações ou destinatários.

**Teste observável:** mensagem adversarial sintética continua texto no site e dado no MCP; não muda schema, ferramentas ou permissões. Resultado inclui referência verificável. Teste no Codex registra comportamento observado, sem prometer imunidade geral. Versão instalada e lockfile demonstram inclusão da correção conhecida.

**Marco:** M1 versão segura; M2 proveniência; M4/M5 fronteira de conteúdo. **Confiança:** MEDIUM; defesa contra injeção é mitigação, não garantia.

## Dívida técnica e armadilhas de integração

| Atalho | Custo posterior | Quando aceitável |
|--------|-----------------|------------------|
| Auth apenas em memória ou utilitário multifile sem estratégia de produção | QR recorrente e sessão corrompida | Experimento isolado de M1; não entrega na VPS |
| Apenas texto normalizado, sem envelope/estado | Correção futura exige recuperar conteúdo que pode ter expirado | Nunca para ingestão real |
| URL remota em vez do binário | Perda irreversível quando mídia desaparece | Só estado pendente, explicitamente mostrado |
| Retry infinito / reconnect recursivo sem exclusão | Disputa de sessão, consumo e filas travadas | Nunca |
| Upgrade automático de dependência / copiar exemplo de branch master | Mudança de auth/parser/protocolo sem migração | Nunca na instância real |

Baileys é integração não oficial; somente leitura não elimina risco de quebra, logout ou restrição da conta. Manter o acervo disponível com coletor desligado e mostrar falha concreta. Não quantificar probabilidade de bloqueio sem evidência. [Aviso do projeto](https://github.com/WhiskeySockets/Baileys#disclaimer).

A documentação já descreve v8 em desenvolvimento e novo formato de auth; isso não demonstra release utilizável. A listagem consultada exibe v7.0.0-rc14. Antes de implantação, conferir registry/tag, changelog e migração na versão escolhida; não importar assinatura nova do Context7/master sem conferir a dependência fixada. [Migração v8](https://baileys.wiki/migration/v8), [releases](https://github.com/WhiskeySockets/Baileys/releases). **Confiança:** MEDIUM.

## Armadilhas de desempenho e experiência

| Armadilha | Sintoma | Prevenção / verificação |
|-----------|---------|------------------------|
| Todas as abas recarregam todas as mensagens | Uma conta grande deixa o site lento | Paginar contexto por cursor estável; buscar só conversa/trecho aberto |
| Timestamp sem desempate, UTC misturado ao horário local | Mensagens somem entre páginas ou aparecem no dia errado | Timestamp de origem, timezone de exibição e desempate por identidade; fixture com mesmo segundo e meia-noite |
| Resultado abre o fim da conversa | Usuário não encontra o acordo localizado | Link estável para ID e janela de contexto; verificar em duas abas independentes |
| Exportação sem manifesto de faltantes | ZIP passa impressão de conteúdo completo | Listar mensagens, arquivos incluídos e indisponíveis; export continua útil sem WhatsApp online |
| MCP retorna conversa inteira ou binários base64 gigantes | Truncamento e conclusão sem contexto | Busca curta, paginação, contexto limitado e recuperação explícita de arquivo autenticado |

São recomendações de engenharia para o volume de uma conta, não estimativas de escala empresarial. **Confiança:** MEDIUM; limites quantitativos pendem da VPS e do acervo.

## Parece pronto, mas falta verificar

- [ ] **Vínculo:** restart com chaves atualizadas, instância duplicada recusada e logout real sinalizado.
- [ ] **Ingestão:** replay, alias PN/LID atrasado, lote com vários itens e atualização antes do original.
- [ ] **Histórico:** comparação real no celular e cobertura parcial visível; nunca selo de “todo o histórico”.
- [ ] **Mídias:** quatro tipos abrem pelos bytes locais offline; expirado, restrito e parcial têm estados diferentes.
- [ ] **Site:** busca abre mensagem no contexto, duas abas independentes e exportação enumera faltantes.
- [ ] **Privacidade:** mídia/export/MCP negam acesso direto sem auth; auth e chaves fora das respostas.
- [ ] **Somente leitura:** nenhuma rota/ferramenta pública ou leitura de tela envia, edita, apaga ou marca leitura remota.
- [ ] **Codex:** conectar cliente real, buscar, ler trecho e recuperar arquivo com credencial válida; token inválido falha.
- [ ] **Operação:** ENOSPC/download interrompido e restore em diretório limpo, sem segundo escritor.

## Recuperação e associação ao roadmap

| Risco | Marco preventivo | Recuperação / evidência necessária |
|-------|------------------|------------------------------------|
| Histórico incompleto | M1/M2 | Pedir lotes adicionais com limites; comparação amostral; ausência continua explícita |
| Alias incorreto / duplicação | M2 | Reprojetar envelopes preservados, reconciliar identidade e checar vínculos/hash |
| Edição/revogação fora de ordem | M2 | Reaplicar eventos sem substituir estado atual por original antigo |
| Auth quebrado / segundo escritor | M1 | Parar coletor concorrente; restaurar auth consistente ou pedir novo QR; preservar arquivo |
| Binário faltante | M3 | Retentar recuperação de protocolo com limite; manter indisponível se original não existir |
| Disco cheio | M3/M6 | Pausar, remover temporários controlados, liberar capacidade e verificar fila/possíveis lacunas |
| Backup inconsistente | M1/M3/M6 | Restaurar conjunto coordenado e manifesto; provar banco + mídia offline antes de vincular |
| Exposição de archive / write público | M4/M5 | Fechar superfície vulnerável, revogar credencial exposta e testar todas as rotas afetadas |
| Payload hostil / versão vulnerável | M1/M2/M5 | Atualizar para release corrigida com backup, revisar proveniência e ensaiar consulta adversarial |

**Pesquisa adicional obrigatória na execução:** cobertura e mídias realmente entregues pela conta; eventos e assinaturas da tag instalada; dimensões da VPS e reserva de disco; formato de retorno de arquivo aceito pelo Codex; política visível de conteúdo já arquivado posteriormente editado/revogado/temporário. Nenhum desses pontos exige OAuth/IdP ou validação no Claude no v1.

## Fontes e limites

Fontes primárias consultadas em 2026-10-10; documentação sem data explícita foi cruzada com código e releases. Links relevantes estão junto às afirmações. O aviso de spoofing foi publicado em 2026-05-20 e atualizado em 2026-06-10; releases de julho de 2026 foram consultados. Fonte de código `master` serve para apontar divergências, não para substituir confirmação na tag instalada.

- [Context7 — WhiskeySockets/Baileys](https://github.com/WhiskeySockets/Baileys): auth, identidade, eventos e mídia; **MEDIUM** pelo classificador GSD, cruzado com documentos/código acima.
- [MCP Tools 2026-07-28](https://modelcontextprotocol.io/specification/2026-07-28/server/tools) e [schema](https://modelcontextprotocol.io/specification/2026-07-28/schema): annotations e resultados estruturados; **MEDIUM**, websearch verificado contra especificação.
- [SQLite Online Backup](https://www.sqlite.org/backup.html): snapshot do banco; **MEDIUM**, documentação oficial; coordenação com arquivos é recomendação desta pesquisa.
- [WhatsApp — histórico em dispositivos vinculados](https://faq.whatsapp.com/653480766448040/): página localizada, corpo não acessível nesta consulta; **LOW**, não usada para afirmar janela de retenção ou cobertura.

Pesquisa documental concluída; nenhum pareamento, download real, instalação, teste de conta, alteração de VPS ou teste de restore foi realizado nesta etapa.
