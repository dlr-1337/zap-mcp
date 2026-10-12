# Zap MCP

## What This Is

Um arquivo privado pessoal que guarda as mensagens e os arquivos reais que a integração conseguir acessar: áudios, imagens, vídeos e documentos. O site local já permite buscar, percorrer contexto, comparar conversas em abas e exportar o recorte arquivado. A consulta pelo MCP no Codex é a próxima capacidade; a implantação privada na VPS pertence à fase 4.

A integração funciona como dispositivo vinculado, com pareamento pelo WhatsApp do celular. A primeira versão é pessoal e somente leitura: sincronizar e armazenar dados não dá à aplicação ou às IAs permissão para enviar mensagens ou alterar conversas no WhatsApp.

## Core Value

Recuperar uma conversa e seus anexos com contexto verificável, pelo site ou pelas IAs, a partir de um arquivo privado sob controle do usuário.

## Requirements

### Validated

- ✓ Vincular uma conta sem navegador no coletor, persistir sua sessão e reconectar sem novo QR — fase 1 local, piloto real verificado.
- ✓ Arquivar mensagens, revisões, autoria, contatos e originais acessíveis com integridade e estados de indisponibilidade — fase 1 local.
- ✓ Consultar dados e baixar arquivos por HTTP autenticado, inclusive em restauração offline, mantendo o WhatsApp somente leitura — fase 1 local.
- ✓ Buscar contato, texto, legenda ou nome de arquivo com período explícito em America/Sao_Paulo, preservando o instante original — fase 2.
- ✓ Abrir contexto por referência estável, percorrer páginas congeladas e comparar conversas em abas independentes — fase 2.
- ✓ Visualizar formatos suportados e baixar originais disponíveis com indicação de faltantes e fallback de codec — fase 2.
- ✓ Exportar todo o recorte escolhido em ZIP com mensagens, manifesto, versões, citações, arquivos e faltantes; pacote só disponível após conferência integral — fase 2.

23 dos 32 requisitos rastreados estão concluídos no escopo local. A verificação independente da fase 2 passou 45/45 critérios, 8/8 requisitos e 7/7 proibições após a UAT autônoma e o fechamento de G-02-6. Isso não comprova cobertura integral da conta nem a implantação futura.

### Active

- [ ] Permitir que o Codex do usuário encontre conversas, leia trechos e recupere arquivos por MCP autenticado e somente leitura.
- [ ] Operar na VPS com transporte protegido, armazenamento persistente, backup externo e restauração conferida; revalidar privacidade e exclusividade do coletor nesse ambiente.

### Out of Scope

- Enviar, responder, apagar ou editar mensagens no WhatsApp — a primeira versão é somente leitura.
- Garantir recuperação de todo o histórico desde a criação da conta — depende do que o WhatsApp disponibiliza ao dispositivo vinculado.
- Garantir download de anexos expirados ou indisponíveis — preservar a indisponibilidade explicitamente, sem fabricar um arquivo.
- Múltiplas contas, outros usuários e SaaS — uso pessoal de uma conta na primeira versão.
- Transcrição automática, OCR, embeddings e chatbot embutido — não foram solicitados; as IAs conectadas fazem a análise do material acessível.
- Automação comercial, disparos, CRM e pagamentos — não são necessários para guardar e consultar o histórico.
- Importadores de outros formatos e fontes — considerar depois de validar a cobertura da sincronização real.
- Validação no Claude e autenticação adicional exigida por outros clientes — o usuário esclareceu que quer usar o MCP no seu Codex no v1; manter o protocolo padrão para extensão posterior.

## Context

- Definição fornecida pelo usuário em 2026-10-10: guardar WhatsApp e arquivos reais, consultar pelo site e dar acesso às IAs por MCP.
- Exemplo de uso: “Leia minha conversa com o João, encontre o orçamento e me diga o que ficou combinado.”
- O usuário esclareceu que “sem depender do WhatsApp Web” significa não depender do navegador; conexão como dispositivo vinculado é a opção desejada.
- A descrição inicial citou Codex e Claude; ao esclarecer onde pretende usar o MCP, o usuário respondeu “no meu codex”. A validação obrigatória do v1 será no Codex do usuário.
- O arquivo persistido deve continuar consultável quando a conexão com WhatsApp cair. A conexão é necessária para obter novos dados, não para reler o que já foi salvo.
- A disponibilidade de mensagens antigas e mídias deve ser investigada e depois validada com a conta real; ausência de um registro no arquivo não prova que ele nunca existiu.
- Ambiente inicial: repositório Git vazio em `<checkout>`, sem `.planning/` anterior.
- Repositório público criado a pedido do usuário: https://github.com/dlr-1337/zap-mcp, com branch principal `main`. Fonte e documentação são públicas; mensagens, mídias, banco, sessões e credenciais permanecem no ambiente privado e fora do Git.
- VPS, domínio, capacidade de armazenamento e acessos de implantação ainda precisam ser identificados na etapa de preparação do ambiente; não são pré-requisitos para este planejamento.
- Não há prazo ou orçamento numérico informado.
- Fases 1 e 2 locais concluídas. Suíte integrada atual 144/144, sem falhas/cancelamentos/skips/todo; aceite real da fase 2 conferiu 1.028 mensagens, 190 originais, 112 faltantes, 1.088 versões e 40 citações contra SQL/ICU/bytes independentes. O verificador reabriu os dois ZIPs e conferiu todas as 192 entradas de cada um.
- UAT autônoma concluiu 17 verificações, incluindo o defeito de perda de posição ao alcançar abas após rolar. O plano02-06 corrigiu a barra e o foco da âncora; clique físico real preservou ambas as posições com delta0, teclado/fechamento/logout passaram na cópia8792/856 sem coletor. Snapshot e senha original preservados. Duas falhas iniciais de I/O e o deslocamento do caminho locator da ferramenta continuam com causa não confirmada; registros preservados.
- A atualização local final preservou senha, identidade e IDs, com snapshot/restore de 8.792 mensagens e 856 originais conferidos. O status autenticado atual do WhatsApp após esse reinício não foi comprovado; processo ativo não substitui essa prova. Zoom nativo e dispositivos físicos permanecem sem teste.

## Constraints

- **Uso pessoal**: uma conta e um proprietário no v1 — evita complexidade de permissões e cobrança sem valor para o objetivo.
- **Somente leitura**: site e MCP não oferecem operações que escrevam no WhatsApp — a sincronização apenas grava no arquivo privado local.
- **Sem navegador**: integração por dispositivo vinculado — não instalar Chromium ou automatizar WhatsApp Web para realizar a sincronização.
- **Cobertura honesta**: armazenar somente o que foi recebido ou recuperado, registrando falhas e limites — não declarar histórico completo sem evidência.
- **Privacidade**: autenticação em todas as superfícies de dados, transporte protegido e arquivos sem URLs públicas permanentes — o acervo inclui negociações e dados de terceiros.
- **Segredos**: credenciais, chaves da sessão e conteúdo privado fora do Git, logs e documentação de exemplo.
- **Persistência**: banco, anexos e sessão sobrevivem a reinícios e atualizações; falha de download ou falta de espaço não apaga mensagens já arquivadas.
- **Simplicidade**: priorizar um serviço e armazenamento local adequados à VPS; adicionar infraestrutura somente quando uma limitação medida exigir.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Integração como dispositivo vinculado, sem navegador | Confirmado pelo usuário; atende a conta pessoal sem depender da interface WhatsApp Web | Piloto real local da fase 1 verificado; implantação VPS pendente |
| Arquivo próprio como fonte de consulta | Mantém o histórico já salvo consultável mesmo sem conexão ativa | Consulta, contexto e exportação offline reais verificados |
| MCP somente leitura com validação no Codex do usuário | A última orientação prioriza o Codex e dispensa autenticação extra para clientes não usados no v1 | Confirmado como escopo |
| Uma conta e um proprietário no v1 | Menor solução completa para o uso pessoal descrito | Padrão assumido; revisável |
| Anexos binários persistidos com estado de disponibilidade | Links de mídia podem expirar e não equivalem a guardar o arquivo | Originais locais e bytes/hash de download/restore conferidos; faltantes explícitos |
| Análise feita pela IA cliente | Dispensa provedor de IA e custos adicionais dentro do site | Padrão assumido; revisável |
| Fases que entregam capacidades utilizáveis de ponta a ponta | Valida cedo a integração real e evita construir a interface sobre uma recuperação inviável | Duas fases locais verificadas; MCP e operação VPS seguem futuras |
| Um serviço Node.js/TypeScript ESM, Express, SQLite FTS5 e arquivos locais | Pesquisa convergiu para a menor arquitetura que atende arquivo, site e MCP na mesma VPS | Node24.21.0, build, testes e operação local verificados; MCP/VPS pendentes |
| Baileys 7.0.0-rc14 fixado para o piloto | Integração direta sem navegador; versão continua não oficial e candidata a lançamento | Pin instalado e piloto local validado; revalidar antes de alterar a release |
| Downloads começam junto da ingestão | Uma mídia recuperável hoje pode não estar acessível ao terminar a interface | Decisão de ordem de implementação |
| Token privado e revogável no MCP do Codex | Cliente obrigatório oferece autenticação por bearer; dispensa provedor de identidade no v1 | Testar no Codex realmente instalado |
| Sessão WhatsApp transacional e um único coletor | Perda de chaves ou escritores concorrentes podem quebrar a conexão e a identidade do arquivo | Persistência, recuperação e um coletor local conferidos |
| Recortes congelados por sessão e contexto por referência | Novas mensagens não podem deslocar páginas ou misturar leituras | Busca/contexto/abas verificados em testes e acervo real |
| Controles de abas alcançáveis durante a leitura e âncora alinhada pelo início | Alcançar o controle não deve substituir a posição salva; mensagens altas não podem esconder o início | G-02-6 fechado com RED/GREEN, matriz de reflow e clique físico real com delta0 nas duas leituras |
| Restrição atual prevalece sobre conteúdo congelado | Uma restrição recebida depois da busca não autoriza entregar conteúdo antigo | DTOs, original, preview e ZIP bloqueiam futuros bytes; primários preservados |
| Preview por ação e fallback para download | Container válido não garante codec suportado pelo navegador | JPEG/Ogg/MP4 reais conferidos; arquivo sem preview continua baixável |
| ZIP integral conferido antes de disponibilizar | Uma página visível ou arquivo parcial não comprova exportação completa | CRC/SHA/conjunto e estados de falha verificados;192 entradas reais por ZIP |
| Atualização local com fallback, snapshot e restore | A interface nova deve preservar o arquivo e a sessão existentes | Última cópia 8.792/856 restaurada; todos IDs e hashes preservados |

## Evolution

Este documento evolui nas transições de fase e nos marcos do projeto.

Após cada fase, mover requisitos realmente verificados para Validated, registrar decisões, acrescentar necessidades descobertas e atualizar contexto e limites de disponibilidade. Requisitos invalidados vão para Out of Scope com o motivo.

Após cada marco, revisar todas as seções, o valor central, as exclusões e a situação real da aplicação. Planejamento, testes simulados e implantação sem pareamento não contam como validação com a conta do usuário.

---
*Last updated: 2026-10-12 after Phase 2 local verification and transition to Phase 3*
