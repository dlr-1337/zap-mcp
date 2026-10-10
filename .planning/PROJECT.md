# Zap MCP

## What This Is

Um site privado na VPS do Otavio que arquiva o histórico de sua conta de WhatsApp e os arquivos reais que a integração conseguir acessar: áudios, imagens, vídeos e documentos. O usuário consulta e exporta esse arquivo pelo site; seu Codex consulta os mesmos dados por MCP, sem copiar conversas manualmente e sem manter um navegador com WhatsApp Web aberto.

A integração funciona como dispositivo vinculado, com pareamento pelo WhatsApp do celular. A primeira versão é pessoal e somente leitura: sincronizar e armazenar dados não dá à aplicação ou às IAs permissão para enviar mensagens ou alterar conversas no WhatsApp.

## Core Value

Recuperar uma conversa e seus anexos com contexto verificável, pelo site ou pelas IAs, a partir de um arquivo privado sob controle do usuário.

## Requirements

### Validated

Nenhum requisito de produto validado ainda; a pasta começou sem código e sem aplicação existente.

### Active

- [ ] Vincular uma conta de WhatsApp sem navegador e manter a sessão na VPS.
- [ ] Sincronizar as mensagens disponíveis e continuar recebendo atualizações, sem duplicar dados ao reconectar.
- [ ] Salvar os arquivos reais acessíveis e indicar quando um arquivo ou trecho do histórico não pôde ser recuperado.
- [ ] Preservar contatos, participantes, datas, autoria e vínculo entre mensagens, conversas e anexos.
- [ ] Consultar o arquivo por contato, palavra ou período, com resultados que abram a conversa no contexto da mensagem.
- [ ] Abrir várias conversas em abas no site.
- [ ] Visualizar ou baixar anexos e exportar mensagens com os arquivos disponíveis.
- [ ] Permitir que o Codex do usuário encontre conversas, leia trechos e recupere arquivos por MCP autenticado e somente leitura.
- [ ] Manter o site, a sessão de WhatsApp, o banco, os arquivos e as exportações privados.
- [ ] Operar na VPS com dados persistentes e backup recuperável.

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
- Ambiente inicial: repositório Git vazio em `/home/otavio/Documents/ChatGPT/zap-mcp 2`, sem `.planning/` anterior.
- VPS, domínio, capacidade de armazenamento e acessos de implantação ainda precisam ser identificados na etapa de preparação do ambiente; não são pré-requisitos para este planejamento.
- Não há prazo ou orçamento numérico informado.

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
| Integração como dispositivo vinculado, sem navegador | Confirmado pelo usuário; atende a conta pessoal sem depender da interface WhatsApp Web | Confirmado como direção; implementação pendente |
| Arquivo próprio como fonte de consulta | Mantém o histórico já salvo consultável mesmo sem conexão ativa | Pendente de implementação |
| MCP somente leitura com validação no Codex do usuário | A última orientação prioriza o Codex e dispensa autenticação extra para clientes não usados no v1 | Confirmado como escopo |
| Uma conta e um proprietário no v1 | Menor solução completa para o uso pessoal descrito | Padrão assumido; revisável |
| Anexos binários persistidos com estado de disponibilidade | Links de mídia podem expirar e não equivalem a guardar o arquivo | Pendente de implementação |
| Análise feita pela IA cliente | Dispensa provedor de IA e custos adicionais dentro do site | Padrão assumido; revisável |
| Fases que entregam capacidades utilizáveis de ponta a ponta | Valida cedo a integração real e evita construir a interface sobre uma recuperação inviável | Definidas em quatro fases no roadmap; execução pendente |
| Um serviço Node.js/TypeScript ESM, Express, SQLite FTS5 e arquivos locais | Pesquisa convergiu para a menor arquitetura que atende arquivo, site e MCP na mesma VPS | Direção técnica; build e operação não validados |
| Baileys 7.0.0-rc14 fixado para o piloto | Integração direta sem navegador; versão pesquisada continua não oficial e candidata a lançamento | Revalidar release e correções antes da instalação; piloto obrigatório |
| Downloads começam junto da ingestão | Uma mídia recuperável hoje pode não estar acessível ao terminar a interface | Decisão de ordem de implementação |
| Token privado e revogável no MCP do Codex | Cliente obrigatório oferece autenticação por bearer; dispensa provedor de identidade no v1 | Testar no Codex realmente instalado |
| Sessão WhatsApp transacional e um único coletor | Perda de chaves ou escritores concorrentes podem quebrar a conexão e a identidade do arquivo | Condição de implementação e operação |

## Evolution

Este documento evolui nas transições de fase e nos marcos do projeto.

Após cada fase, mover requisitos realmente verificados para Validated, registrar decisões, acrescentar necessidades descobertas e atualizar contexto e limites de disponibilidade. Requisitos invalidados vão para Out of Scope com o motivo.

Após cada marco, revisar todas as seções, o valor central, as exclusões e a situação real da aplicação. Planejamento, testes simulados e implantação sem pareamento não contam como validação com a conta do usuário.

---
*Last updated: 2026-10-10 after initialization and user clarification*
