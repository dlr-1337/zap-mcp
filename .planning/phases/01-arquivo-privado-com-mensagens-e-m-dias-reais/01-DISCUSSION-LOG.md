# Phase 1: Arquivo privado com mensagens e mídias reais - Discussion Log

> Registro para auditoria humana. Não usar como entrada dos agentes de pesquisa, planejamento ou execução. As decisões canônicas estão em `01-CONTEXT.md`.

**Date:** 2026-10-10
**Phase:** 1 — Arquivo privado com mensagens e mídias reais
**Modo:** `--all --auto`
**Origem das escolhas:** padrão recomendado selecionado pelo agente por autorização explícita de modo automático; não são respostas individuais dadas pelo usuário.
**Areas discussed:** Entrada privada do proprietário, QR e reconexão, Cobertura, alterações e conteúdo temporário, Anexos, fila e falta de espaço, Leitura básica e aceite do piloto

## Entrada privada do proprietário

**Questão:** Como entrar no site?

| Opção | Selecionada |
|---|---|
| Senha local de um proprietário | Sim — padrão recomendado em `--auto` |
| Login por provedor externo |  |

**Decisão automática:** Senha local de um proprietário, sem cadastro público ou IdP adicional.

**Questão:** Onde manter a autenticação?

| Opção | Selecionada |
|---|---|
| Sessão privada no servidor | Sim — padrão recomendado em `--auto` |
| Bearer no navegador |  |

**Decisão automática:** Sessão de navegador privada e revogável no servidor, sem credencial em URL ou armazenamento acessível ao conteúdo das conversas.

**Questão:** O que acontece ao sair do site?

| Opção | Selecionada |
|---|---|
| Invalidar só a sessão do site | Sim — padrão recomendado em `--auto` |
| Também desconectar o coletor |  |

**Decisão automática:** Invalidar a sessão do site; manter o coletor e o acervo. Sair do site não desvincula o WhatsApp.

**Questão:** Como recuperar acesso?

| Opção | Selecionada |
|---|---|
| Redefinição local operacional | Sim — padrão recomendado em `--auto` |
| Recuperação por e-mail |  |

**Decisão automática:** Redefinição operacional local com acesso autorizado ao host; sem recuperação por e-mail nem painel de usuários no v1.

**Notas:** respeita o escopo e os requisitos já definidos; nenhuma pergunta interativa.

## QR e reconexão

**Questão:** Onde apresentar o QR?

| Opção | Selecionada |
|---|---|
| Tela privada com QR vigente | Sim — padrão recomendado em `--auto` |
| QR em terminal/log |  |

**Decisão automática:** Somente na tela autenticada, com validade atual e instrução de ler em Dispositivos conectados no celular; nunca em logs.

**Questão:** Como mostrar a conexão?

| Opção | Selecionada |
|---|---|
| Estados explícitos e cobertura separada | Sim — padrão recomendado em `--auto` |
| Indicador conectado/desconectado |  |

**Decisão automática:** Distinguir aguardando pareamento, conectando, conectado, reconectando, desconectado e sessão inválida, sem associar conectado a histórico completo.

**Questão:** Como retomar uma queda?

| Opção | Selecionada |
|---|---|
| Retomada limitada com sessão persistida | Sim — padrão recomendado em `--auto` |
| Novo QR em cada falha |  |

**Decisão automática:** Reconectar automaticamente com espera e tentativas limitadas; pedir novo QR apenas quando a sessão de fato deixar de ser válida.

**Questão:** O que proteger ao perder a sessão?

| Opção | Selecionada |
|---|---|
| Conservar acervo e explicar estado | Sim — padrão recomendado em `--auto` |
| Reiniciar arquivo ao parear |  |

**Decisão automática:** Conservar mensagens e anexos e explicar a necessidade de novo pareamento; nunca limpar acervo para reconectar.

**Notas:** respeita o escopo e os requisitos já definidos; nenhuma pergunta interativa.

## Cobertura, alterações e conteúdo temporário

**Questão:** Quanto histórico solicitar?

| Opção | Selecionada |
|---|---|
| Histórico disponibilizado e alcance explícito | Sim — padrão recomendado em `--auto` |
| Janela local fixa |  |

**Decisão automática:** Receber todo histórico disponibilizado pelo vínculo, sem recorte local arbitrário nem promessa de janela integral; pedidos extras só se suportados e necessários ao piloto.

**Questão:** Por quanto tempo conservar alterações?

| Opção | Selecionada |
|---|---|
| Retenção local sem expurgo automático | Sim — padrão recomendado em `--auto` |
| Apagar versões anteriores |  |

**Decisão automática:** Conservar localmente por prazo indeterminado o material efetivamente capturado e revisões/revogações observadas, distinguindo estado atual e registro anterior; sem expurgo automático no v1.

**Questão:** Como tratar temporárias e visualização única?

| Opção | Selecionada |
|---|---|
| Preservar apenas material normalmente entregue | Sim — padrão recomendado em `--auto` |
| Tentar recuperar conteúdo restrito |  |

**Decisão automática:** Não contornar restrições: temporárias recebidas normalmente podem ser arquivadas com indicação; visualização única fica em metadados e indisponibilidade, sem abrir ou baixar por bypass.

**Questão:** Como expressar ausência e progresso?

| Opção | Selecionada |
|---|---|
| Cobertura observada com limites | Sim — padrão recomendado em `--auto` |
| Histórico completo ao terminar lote |  |

**Decisão automática:** Mostrar última ingestão, intervalo de instantes observados, lotes e falhas; usar não encontrado no acervo e separar lote concluído de cobertura da conta.

**Notas:** respeita o escopo e os requisitos já definidos; nenhuma pergunta interativa.

## Anexos, fila e falta de espaço

**Questão:** Qual material salvar?

| Opção | Selecionada |
|---|---|
| Originais disponíveis com proveniência | Sim — padrão recomendado em `--auto` |
| Somente links e miniaturas |  |

**Decisão automática:** Bytes originais disponíveis dos quatro tipos, desde a ingestão, mantendo legenda/nome recebidos e sem transcodificação preventiva.

**Questão:** Como apresentar falhas de mídia?

| Opção | Selecionada |
|---|---|
| Quatro estados com motivo seguro | Sim — padrão recomendado em `--auto` |
| Disponível ou ausente |  |

**Decisão automática:** Distinguir pendente, disponível verificado, falha recuperável e indisponível, com motivo seguro e tentativas; falha não esconde a mensagem.

**Questão:** O que fazer após interrupção?

| Opção | Selecionada |
|---|---|
| Retomada automática limitada | Sim — padrão recomendado em `--auto` |
| Botão manual por arquivo |  |

**Decisão automática:** Recuperar fila persistente, reconciliar temporários e arquivos finais e repetir downloads recuperáveis com concorrência e tentativas limitadas; sem painel extra de gerenciamento.

**Questão:** O que fazer sem espaço?

| Opção | Selecionada |
|---|---|
| Pausar e preservar dados | Sim — padrão recomendado em `--auto` |
| Apagar antigos para liberar espaço |  |

**Decisão automática:** Pausar downloads e sinalizar falta de espaço; preservar binários e mensagens já gravados, admitir que falha de ingestão não foi arquivada e nunca apagar automaticamente para liberar espaço.

**Notas:** respeita o escopo e os requisitos já definidos; nenhuma pergunta interativa.

## Leitura básica e aceite do piloto

**Questão:** Como navegar na fase 1?

| Opção | Selecionada |
|---|---|
| Lista e conversa básica | Sim — padrão recomendado em `--auto` |
| Interface completa com busca e abas |  |

**Decisão automática:** Interface simples com estado de conexão, lista de conversas, uma conversa por vez, mensagens e acesso privado ao original disponível; leitura limitada e ordenada sem carregar todo o acervo.

**Questão:** O que mostrar junto das mensagens?

| Opção | Selecionada |
|---|---|
| Evidências e faltantes explícitos | Sim — padrão recomendado em `--auto` |
| Só texto e horário |  |

**Decisão automática:** Autor/direção, data original em America/Sao_Paulo, referência, tipo, texto/legenda, citação recebida, alterações e estados de anexo; campos desconhecidos explícitos e homônimos distintos.

**Questão:** Quando iniciar dados reais?

| Opção | Selecionada |
|---|---|
| Backup conferido antes do QR | Sim — padrão recomendado em `--auto` |
| Backup após primeiro lote |  |

**Decisão automática:** Só após preparar e conferir cópia privada recuperável e exclusividade do coletor; manter consulta sem coletor para testes e restauração.

**Questão:** O que comprova o piloto?

| Opção | Selecionada |
|---|---|
| Evidência real e pendências explícitas | Sim — padrão recomendado em `--auto` |
| Fixtures e QR como aceite |  |

**Decisão automática:** Comparar conversa conhecida e exemplos reais acessíveis dos quatro tipos com o celular, incluir grupo/direção recebida-enviada, testar leitura offline e reinício; falta de acesso, QR ou amostra mantém aceite pendente.

**Notas:** respeita o escopo e os requisitos já definidos; nenhuma pergunta interativa.

## Discrição do agente

Módulos/schema, bibliotecas mínimas, layout e limites operacionais ficam para pesquisa e planejamento com verificação de versão/ambiente.

## Deferred Ideas

Nenhuma capacidade nova; busca/abas/exportação, MCP e operação final continuam nas fases 2, 3 e 4. Claude/importador seguem v2. Na discussão inicial, piloto e cobertura real ainda não estavam verificados; a retomada abaixo registra a situação atual.

## Retomada `1 --all --auto` após o piloto

As decisões D-01 a D-20 foram mantidas em uma única revisão. O contexto descrevia o repositório ainda vazio; os ativos implementados e as referências do checkpoint foram atualizados, sem criar nova capacidade ou repetir decisões encerradas.

**Área restante:** amostra conhecida para comparação do piloto.

| Opção | Selecionada | Motivo |
|---|---|---|
| Usar o grupo conhecido indicado indicado pelo proprietário | Sim — indicação humana já recebida | Reutiliza mensagens e quatro tipos de originais existentes |
| Escolher outro grupo ou gerar mensagens de teste | Não | Não há necessidade de nova amostra; envio pelo Zap MCP permanece fora do escopo |

**Escolha automática:** operacionalizar a indicação já recebida, mantendo D-20 e a necessidade de uma conversa individual conhecida. Não foi solicitada nova resposta para uma escolha já resolvida.

**Evidência na checagem inicial da retomada:** HTTP privado conectado, coletor e navegador ativos, QR indisponível porque o vínculo está estabelecido. As provas registradas de quatro originais, restauração offline e reinício continuam válidas; não foram repetidas nesta revisão documental. Na checagem final, o coletor continuava conectado e o navegador de apoio havia encerrado normalmente; situação registrada no checkpoint.

**Resposta humana ainda vigente:** “Ainda não consegui comparar”. Nenhum aceite foi inferido do modo automático. Planos 01–06 permanecem concluídos; plano 07 mantém o checkpoint humano, sem replanejamento da implementação existente.
