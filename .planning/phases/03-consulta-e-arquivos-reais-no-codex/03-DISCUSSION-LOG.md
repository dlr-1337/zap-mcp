# Phase 3: Consulta e arquivos reais no Codex - Discussion Log

> Registro para auditoria humana. Não usar como entrada para pesquisa/planejamento/execução; decisões canônicas em 03-CONTEXT.md.

**Date:** 2026-10-12
**Phase:** 3 — Consulta e arquivos reais no Codex
**Modo:** `--all --auto`. Todas as áreas e recomendações selecionadas pelo agente; não houve perguntas nem respostas individuais do usuário.
**Areas discussed:** Acesso privado e prova inicial; Localizar conversas e buscar com limites; Contexto e proveniência compartilhados; Entrega de originais e limites do cliente; Somente leitura e aceite autônomo

## Acesso privado e prova inicial

**Pergunta considerada:** Qual cliente valida a entrega?

| Opção | Selecionada |
|---|---|
| Codex realmente instalado (recomendada) | Sim, pelo agente |
| Cliente SDK isolado | Não |

**Nota:** O cliente SDK serve a testes; o aceite exige o Codex do proprietário.

**Pergunta considerada:** Como autenticar o MCP?

| Opção | Selecionada |
|---|---|
| Bearer exclusivo e revogável (recomendada) | Sim, pelo agente |
| Reutilizar cookie do site | Não |

**Nota:** Token em armazenamento privado, nunca em URL, logs, Git ou retorno de ferramenta; autenticar cada requisição e transferência.

**Pergunta considerada:** Como revogar e renovar?

| Opção | Selecionada |
|---|---|
| Operação administrativa local mínima (recomendada) | Sim, pelo agente |
| Novo painel de credenciais | Não |

**Nota:** Invalidar o token anterior, seus cursores e transferências; logout do site não desvincula a conta nem redefine o MCP.

**Pergunta considerada:** Quando ampliar as ferramentas?

| Opção | Selecionada |
|---|---|
| Após prova curta de conexão e arquivo (recomendada) | Sim, pelo agente |
| Implementar tudo antes de testar cliente | Não |

**Nota:** Revalidar SDK/protocolo e transporte protegido no cliente real; falha essencial vira evidência e ajuste, sem simular sucesso.

## Localizar conversas e buscar com limites

**Pergunta considerada:** Como identificar o contato certo?

| Opção | Selecionada |
|---|---|
| Candidatos distintos e ID canônico (recomendada) | Sim, pelo agente |
| Selecionar apenas pelo nome | Não |

**Nota:** Preservar homônimos, grupo/individual e identidades recebidas; não mesclar PN/LID sem evidência.

**Pergunta considerada:** Como interpretar a busca?

| Opção | Selecionada |
|---|---|
| Mesmas regras do site (recomendada) | Sim, pelo agente |
| Nova linguagem livre de consulta | Não |

**Nota:** Contato/conversa, termos simples e período por AND sobre texto, legenda e filename recebidos; sem SQL livre.

**Pergunta considerada:** Como percorrer resultados?

| Opção | Selecionada |
|---|---|
| Páginas limitadas e continuação explícita (recomendada) | Sim, pelo agente |
| Retornar conversa inteira | Não |

**Nota:** Congelar o recorte; cursores autenticados por escopo/token/filtros, expiração e atualização explícitas; sem truncamento silencioso.

**Pergunta considerada:** Como informar alcance e datas?

| Opção | Selecionada |
|---|---|
| Filtros efetivos, cobertura e fuso (recomendada) | Sim, pelo agente |
| Só texto dos resultados | Não |

**Nota:** America/Sao_Paulo com dias inclusivos, UTC/offset e instante original conferíveis; ausência significa não encontrado no acervo.

## Contexto e proveniência compartilhados

**Pergunta considerada:** Como abrir um trecho?

| Opção | Selecionada |
|---|---|
| Referência estável e vizinhas paginadas (recomendada) | Sim, pelo agente |
| Texto agregado sem IDs | Não |

**Nota:** Destacar âncora e permitir antes/depois, reutilizando snapshots e contexto da busca quando existente.

**Pergunta considerada:** Quais evidências devolver?

| Opção | Selecionada |
|---|---|
| Projeções sanitizadas iguais ao site (recomendada) | Sim, pelo agente |
| Envelope bruto do WhatsApp | Não |

**Nota:** IDs, autoria/direção, datas, citação, alterações observadas, estados de anexo e campos desconhecidos; sem chaves/payload privado.

**Pergunta considerada:** Como tratar alterações posteriores?

| Opção | Selecionada |
|---|---|
| Restrição atual prevalece (recomendada) | Sim, pelo agente |
| Entregar sempre o conteúdo congelado | Não |

**Nota:** Snapshot não autoriza conteúdo hoje restrito; revalidar no consumo de resposta e dos próximos bytes.

**Pergunta considerada:** Como tratar instruções em mensagens?

| Opção | Selecionada |
|---|---|
| Conteúdo citado como dado não confiável (recomendada) | Sim, pelo agente |
| Promover mensagem a instrução do agente | Não |

**Nota:** Separar instruções fixas das ferramentas e dados recebidos; nenhuma execução, autoabertura de URL ou mudança de permissões.

## Entrega de originais e limites do cliente

**Pergunta considerada:** Como pedir um arquivo?

| Opção | Selecionada |
|---|---|
| ID interno de anexo (recomendada) | Sim, pelo agente |
| Caminho ou URL arbitrária | Não |

**Nota:** Vincular anexo à mensagem, preservar nome como metadado; usar original verificado, sem transcodificar nem refazer download remoto para consulta.

**Pergunta considerada:** Qual forma de entrega?

| Opção | Selecionada |
|---|---|
| Retorno suportado e transferência autenticada (recomendada) | Sim, pelo agente |
| Somente listagem de recurso ou URL | Não |

**Nota:** Prova no Codex determina suporte inline pequeno e download para grande/sem formato suportado; bearer nunca na URL e nenhuma URL pública permanente.

**Pergunta considerada:** Como confirmar recebimento?

| Opção | Selecionada |
|---|---|
| Bytes, tamanho e SHA-256 no destino (recomendada) | Sim, pelo agente |
| A ferramenta retornou sucesso | Não |

**Nota:** Conferir artefato efetivamente recuperado pelo Codex com original; distinguir metadados, transferência parcial e entrega concluída.

**Pergunta considerada:** Como informar falta ou excesso?

| Opção | Selecionada |
|---|---|
| Estado/motivo e limite explícitos (recomendada) | Sim, pelo agente |
| Binário vazio ou base64 ilimitado | Não |

**Nota:** Pendente/falha/indisponível não é entrega; tipos/tamanhos sem suporte apontam caminho privado de download; validar interrupção e revogação.

## Somente leitura e aceite autônomo

**Pergunta considerada:** Quais operações públicas oferecer?

| Opção | Selecionada |
|---|---|
| Lista fechada de consultas locais (recomendada) | Sim, pelo agente |
| Dispatcher genérico do coletor | Não |

**Nota:** Nenhuma ferramenta de enviar/editar/apagar/marcar leitura; módulos de consulta não recebem sessão/socket WhatsApp.

**Pergunta considerada:** Qual amostra valida o fluxo?

| Opção | Selecionada |
|---|---|
| Conversa e originais reais já arquivados (recomendada) | Sim, pelo agente |
| Fabricar amostra enviando mensagem | Não |

**Nota:** Buscar contato, mensagem, contexto e conferir arquivo pequeno/grande conforme suporte real; sem novo pareamento ou envio para produzir evidência.

**Pergunta considerada:** Quem faz as verificações?

| Opção | Selecionada |
|---|---|
| Agente autonomamente nos acessos disponíveis (recomendada) | Sim, pelo agente |
| Pedir cliques rotineiros ao proprietário | Não |

**Nota:** Configurar cliente, testar auth/rotacao, negociar protocolo, comparar site/MCP e conferir arquivo; participação só se acesso indispensável faltar.

**Pergunta considerada:** Como publicar evidência?

| Opção | Selecionada |
|---|---|
| Recibos sanitizados e dados privados fora do Git (recomendada) | Sim, pelo agente |
| Dump integral do acervo e config | Não |

**Nota:** Registrar cliente/versões, negociação, casos de acesso recusado, contagens e hashes conferidos, sem nomes/textos/segredos privados em docs públicas.


## Discrição do agente

SDK/protocolo compatíveis, esquema mínimo, limites medidos, transferência suportada pelo cliente, transporte protegido, emissão/rotação privada e testes proporcionais. Reutilizar contratos sem infraestrutura preventiva.

## Deferred Ideas

Operação VPS e backup externo na fase 4; Claude em v2. Nenhuma capacidade nova inserida nesta discussão.
