# Zap MCP

Arquivo privado de WhatsApp com uma conta, um proprietário e um coletor, por dispositivo vinculado sem navegador.

## Status

As fases 1 e 2 locais estão concluídas e verificadas. O site oferece busca por contato, texto e período, contexto paginado, conversas em abas, preview sob ação e exportação integral do recorte arquivado em ZIP. A suíte integrada passou 144/144 testes; a verificação independente da fase 2 passou 45/45 critérios e 8/8 requisitos, sem gaps, após corrigir a perda de posição ao alcançar abas e concluir a UAT autônoma.

O aceite real conferiu 1.028 mensagens, 190 originais e 112 faltantes no recorte escolhido, preservando versões e citações; ambos ZIPs tiveram todas as 192 entradas e os hashes conferidos. A atualização local preservou senha, identidade e IDs, após snapshot/restore de 8.792 mensagens e 856 originais. Essas contagens são das cópias verificadas, sem garantia de histórico integral. [Evidências da fase 2](.planning/phases/02-busca-contexto-abas-e-exporta-o-no-site/02-VERIFICATION.md).

As fases 1, 2 e 3 locais estão concluídas. O Codex instalado completou busca, contexto e recuperação de dois originais por HTTPS verificado em clone offline. A verificação independente passou 21/21 critérios e cinco requisitos MCP; UAT autônoma12/12 e suíte integrada190/190, sem falhas ou testes pulados. O endpoint de aceite foi encerrado e a configuração global do Codex preservada. [Verificação](.planning/phases/03-consulta-e-arquivos-reais-no-codex/03-VERIFICATION.md) e [UAT](.planning/phases/03-consulta-e-arquivos-reais-no-codex/03-UAT.md).

VPS, canal/proxy operacional e backup externo recorrente pertencem à fase 4. O preparo local já inclui origem HTTPS/CSRF/cookie Secure, snapshot coordenado, fence/promoção e pull cifrado com age; fixtures de release/TLS/update preservam dados recentes e rollback troca somente código. Docker/Traefik foram identificados no painel, mas implantação/backup externo/agenda e aceite permanente ainda dependem das provas reais. [Procedimento operacional](ops/README.md). A leitura do material arquivado funciona offline.

## Escopo da primeira versão

- **Guardar:** arquivar mensagens e os arquivos reais de áudio, imagem, vídeo e documento que a integração conseguir acessar.
- **Consultar:** pesquisar por contato, palavra ou período, abrir conversas em abas e exportar mensagens com os anexos disponíveis.
- **Usar no Codex:** localizar conversas, recuperar contexto e obter arquivos por MCP privado e somente leitura.

Uma conta e um proprietário. O site e o MCP consultam o arquivo persistido; não oferecem envio, edição, exclusão ou confirmação de leitura no WhatsApp. A integração pode recuperar apenas parte do histórico e das mídias, e esses limites devem aparecer nas consultas.

## Roadmap

1. Arquivo privado com mensagens e mídias reais.
2. Busca, contexto, abas e exportação no site.
3. Consulta e recuperação de arquivos no Codex.
4. Operação, backup e restauração na VPS.

Veja o [contexto do projeto](.planning/PROJECT.md), os [requisitos](.planning/REQUIREMENTS.md), o [roadmap completo](.planning/ROADMAP.md) e a [pesquisa técnica](.planning/research/SUMMARY.md).

## Busca, abas e exportação

Depois de entrar, escolha um contato ou grupo pelos candidatos apresentados e combine termo e período. Datas dos filtros usam America/Sao_Paulo; mensagens sem instante original conhecido ficam explícitas e não recebem uma data inventada. Um resultado abre sua mensagem no contexto; abas conservam posições de leitura independentes.

Imagem, áudio e vídeo suportados abrem sob ação. Arquivos disponíveis continuam com download privado quando o navegador não suporta o formato. “Exportar conversa” permite gerar um ZIP de toda a conversa arquivada ou do período escolhido, incluindo mensagens além da página visível. O pacote inclui mensagens.txt, manifest.json e os originais disponíveis; anexos faltantes e versões capturadas são relacionados no manifesto. Falha não produz um pacote rotulado como pronto.

O recorte fica congelado, mas uma restrição de privacidade recebida depois bloqueia conteúdo e bytes futuros, inclusive em downloads já abertos. Bytes que já foram entregues não podem ser recolhidos. Não há envio, edição, exclusão ou confirmação de leitura no WhatsApp.

## Piloto local verificado

Em 2026-10-11, conta real vinculada e amostras de conversa individual/grupo comparadas autonomamente com WhatsApp Web, conforme autorização do proprietário. Áudio, imagem, vídeo e documento foram correlacionados pelos IDs de origem; seus originais preservados passaram pela conferência de tamanho/hash recebido da origem, disco e HTTP autenticado. A comparação cobre somente o recorte observado, sem afirmar histórico integral ou comparação dos bytes baixados diretamente do Web.

Após corrigir repetição de originais que ocultava 244 projeções, uma cópia privada pós-reparo restaurou 8.684 mensagens e 828 originais disponíveis. Fonte parada durante verificação e nenhum segundo coletor; único coletor voltou conectado sem novo QR. Download de áudio pelo Chrome normal completou 33.529 bytes com hash igual ao acervo e página funcionando. A suíte completa passou 86 testes; revisão incremental passou 12 testes e 29 verificações independentes, sem achados novos. Fase1 local concluída: verificação independente passou 88 condições e 15 requisitos, com 28 testes focados adicionais.

O navegador auxiliar separado sofreu SIGSEGV de causa nativa não determinada e foi retirado do procedimento; não houve alteração global de Chromium. Use o Chrome normal para consultar o site. Campos desconhecidos e mídias não recuperadas permanecem explícitos. Casos e arquivos reais continuam privados fora do Git; a prova MCP local posterior está descrita acima e VPS permanece pendente.

## Privacidade

O repositório público contém o código e os documentos do projeto. Mensagens reais, anexos, bancos, sessões de WhatsApp, credenciais e exportações devem permanecer no ambiente privado e fora do Git. As regras de exclusão estão em [.gitignore](.gitignore); todo material novo precisa respeitar essa separação.

## Uso local

Node24.21.0 é obrigatório, inclusive para o módulo SQLite. Com mise instalado:

```sh
mise exec node@24.21.0 -- npm ci
mise exec node@24.21.0 -- npm run build
export ZAP_DATA_DIR=/caminho/privado/zap
export ZAP_PORT=3000
mise exec node@24.21.0 -- node dist/src/main.js profile-init
read -rs -p 'Senha local: ' ZAP_OWNER_PASSWORD
printf '%s' "$ZAP_OWNER_PASSWORD" | mise exec node@24.21.0 -- node dist/src/main.js owner-set
unset ZAP_OWNER_PASSWORD
mise exec node@24.21.0 -- node dist/src/main.js serve
```

Os testes de interface exigem Playwright1.62.1 e seu Chromium151.0.7922.34. O CI instala esse ambiente de teste em diretório temporário externo, define `ZAP_BROWSER_MODULE` e `ZAP_BROWSER_EXECUTABLE` e executa `npm test`, sem conta ou sessão WhatsApp. Esses componentes são exclusivos dos testes; o coletor funciona sem navegador. A instalação no CI segue a [documentação oficial do Playwright](https://playwright.dev/docs/ci).

Para testar localmente com uma instalação existente, aponte `ZAP_BROWSER_MODULE` para o `package.json` do diretório `node_modules` que contém Playwright e `ZAP_BROWSER_EXECUTABLE` para o executável desse Chromium. Então execute `mise exec node@24.21.0 -- npm test`. No Codex, o harness já possui um caminho padrão para o Playwright do bundle; o executável pode ser indicado explicitamente.

Escolha diretório privado fora do checkout; o caminho acima é fictício. `.env.example` documenta variáveis, mas `.env` não é carregado automaticamente. Senha passa por stdin, nunca por argumento/histórico. `owner-set` revoga sessões anteriores e exige serviço parado. `profile-init` cria somente credenciais locais offline; não substitui perfil corrompido e não conecta conta.

Abra http://127.0.0.1:3000, entre e consulte o acervo local. `serve` inicia com coletor desligado. O modo local usa loopback; proxy HTTPS exige origem canônica e peer exato conforme [.env.example](.env.example) e [ops](ops/README.md), com backend privado. Nenhuma superfície oferece envio, edição, exclusão ou confirmação de leitura no WhatsApp.

## Consulta no Codex

O servidor oferece somente estas quatro ferramentas:

| Ferramenta | Uso |
|---|---|
| `find_conversations` | `query` e `cursor` opcional; apresenta candidatos separados por `conversationId` canônico, nome/identidade/kind recebidos |
| `search_messages` | `query`, `conversationId` opcional e dias `from`/`to`; AND sobre texto/legenda/nome recebido de arquivo, incluindo revisões observadas |
| `get_context` | `reference` da mensagem; `searchCursor` opcional preserva origem da busca; continuação com `direction` before/after e o cursor correspondente |
| `get_attachment` | `attachmentId` e preferência inline/download; original disponível e verificado, ou estado/motivo explícitos |

Escolha o ID canônico apresentado, sem decidir por nomes homônimos. Datas usam America/Sao_Paulo com dias inclusivos; UTC/offset e instante original continuam conferíveis. Sem período, instantes desconhecidos aparecem por último; com período, ficam fora do filtro. Ausência significa somente “não encontrado no acervo observado”.

Use `nextCursor` com os mesmos filtros para continuar a busca; `searchCursor` também aparece na última página e pode abrir a âncora. Contexto traz âncora explícita, vizinhas e cursores antes/depois. Os recortes ficam congelados por até 30 minutos, mas restrições atuais prevalecem. Cursor expirado, revogado ou de outro filtro pede atualização sem cursor. Limites são explícitos: até 50 itens por página, 50 mil itens/64 MiB por recorte e 32 KiB por envelope de consulta. Uma evidência que não caiba gera `response_limit` sem truncar campos ou avançar o cursor. Esses são limites do servidor, não um teto medido do cliente.

Cobertura preserva contagens/intervalos/última ingestão e estados de histórico. `batchSummary` agrega contagens e estados dos lotes; os detalhes de cada lote continuam no status autenticado do site. Nomes, textos, citações, revisões e arquivos recebidos são dados não confiáveis, nunca instruções para executar código, abrir URLs ou revelar segredos. Não há ferramenta de envio, edição, exclusão ou confirmação de leitura.

Para configurar o Codex, tenha primeiro um canal HTTPS vigente e deliberado até o serviço privado. O aceite local usou TLS nativo transitório e não instalou endpoint permanente ou CA de sistema. O antigo Origin403 do site foi corrigido e comprovado em proxy TLS de fixture na fase4; login e MCP no endpoint permanente ainda exigem aceite real.

Com `ZAP_DATA_DIR` apontando ao perfil correto, emita/rotacione o bearer para um arquivo novo em diretório privado fora do checkout. Os caminhos e a porta abaixo são fictícios:

```sh
install -d -m 700 /caminho/privado/mcp
mise exec node@24.21.0 -- node dist/src/main.js mcp-token-rotate /caminho/privado/mcp/token-01
read -r ZAP_MCP_TOKEN < /caminho/privado/mcp/token-01
export ZAP_MCP_TOKEN
# Se o canal usa CA privada, confie nela somente no processo cliente.
export SSL_CERT_FILE=/caminho/privado/mcp/ca.pem
cp --preserve=mode ~/.codex/config.toml /caminho/privado/mcp/config.before.toml
codex mcp add zap_archive --url https://localhost:3443/mcp --bearer-token-env-var ZAP_MCP_TOKEN
codex
unset ZAP_MCP_TOKEN SSL_CERT_FILE
```

A variável precisa existir no processo Codex que acessa o MCP; não coloque bearer literal no TOML, prompt, URL ou argumentos. `codex mcp add` altera somente o registro escolhido: use um nome livre e preserve os demais servidores. A prova executada usou overrides `-c` por subprocesso e comparou o TOML original byte a byte, sem gravar esse registro. Para encerrar um canal transitório configurado manualmente, remova somente seu registro com `codex mcp remove zap_archive`. O backup permite recuperar a configuração anterior se nenhuma outra edição posterior precisar ser preservada.

Rotação pode operar com o serviço ativo, sem coletor ou novo QR. Emita outro arquivo novo, carregue a variável novamente e reinicie o processo cliente. Bearer anterior, cursores e próximos bytes de transferências são recusados; arquivos parciais não são entrega concluída. Logout do site não revoga MCP; rotação MCP não altera senha ou sessão WhatsApp. Bytes já entregues não podem ser recolhidos.

`get_attachment` pode retornar imagem inline reconhecida de até 256 KiB. Para maior/sem formato inline, retorna `download_required` e URL privada da mesma origem HTTPS. O GET separado precisa de bearer vigente; o cliente não o aplica automaticamente a um link. Baixe explicitamente, recuse redirects/outra origem e confira tamanho/SHA-256 no destino. O aceite gravou os dois originais por helper executado no Codex; não declarou metadata, URL ou inline sem gravação como arquivo salvo.

Roteiro repetível: `node scripts/phase3-acceptance.mjs --mode self-test` após build e `--mode real-codex` com `ZAP_MCP_REAL_CASE_FILE` externo preparado. O modo real exige acesso real, Codex instalado, negociação/TLS/calls atuais, SQL/site independentes e arquivos novos; ausência é erro, nunca skip. Dados/casos/transcripts ficam privados. Nenhuma dessas verificações demonstra histórico integral, implantação VPS ou restore operacional final.

## Cópia e recuperação antes do piloto

Pare o serviço com Ctrl+C ou `kill -TERM PID_DO_SERVICO` e aguarde o processo encerrar. O encerramento suspende o coletor, cancela/drena streams e fecha bancos antes de liberar a trava. Backup recusa serviço ativo; nunca remova uma trava à força. Escolha destino novo, fora do perfil fonte e do checkout, com espaço para a cópia mais reserva de max(256MiB, 5% do volume).

```sh
mise exec node@24.21.0 -- node dist/src/main.js backup /caminho/privado/copia-001
mise exec node@24.21.0 -- node dist/src/main.js restore /caminho/privado/copia-001 /caminho/privado/restore-001
ZAP_DATA_DIR=/caminho/privado/restore-001 mise exec node@24.21.0 -- node dist/src/main.js serve
```

Snapshot offline inclui bancos por API de backup SQLite (inclusive WAL), originais disponíveis finalizados e seus manifests. Contagens de todas tabelas, schema, FK/integridade e hashes são conferidos antes da publicação atômica. Temporários e arquivos desconhecidos continuam preservados na fonte; uma cópia não afirma que mídia pendente foi recuperada. Snapshots são imutáveis: cada atualização usa novo destino, preservando cópia anterior mesmo em corrupção, interrupção ou falta de espaço. Dir0700/arquivo0600; snapshot contém sessão e conteúdo privado, portanto nunca deve ir ao Git, logs ou pacote público.

Restore exige destino inexistente e inicia somente consulta offline. Não inicia segundo coletor. Restaurar bytes da sessão não prova sua validade remota. A integração não oficial pode entregar apenas parte do histórico e mídias; ausência significa “não encontrado no acervo”.

Para conferir a cópia e gravar o recibo obrigatório no perfil fonte, mantenha a fonte parada e use outro destino novo:

```sh
mise exec node@24.21.0 -- node dist/src/main.js verify-backup /caminho/privado/copia-001 /caminho/privado/verificacao-001
mise exec node@24.21.0 -- node dist/src/main.js preflight
```

`verify-backup` restaura sem coletor, confere SQL/schema/contagens/hash, testa login, percorre mensagens e baixa originais pelo HTTP autenticado em loopback. Para exercitar login troca somente a senha da cópia de verificação por uma senha efêmera; essa cópia permanece para inspeção privada, mas para consulta pessoal use um `restore` separado com a senha original. Só após sucesso grava recibo privado autenticado, ligado à identidade do perfil fonte, ao seu diretório e ao hash do manifesto. `preflight` é somente leitura: confere runtime, permissões, reserva, ausência de trava e recibo/snapshot íntegro, sem imprimir caminhos nem segredos. Falha tem exit não zero. Trava órfã exige retomada offline normal (`serve` e parada graciosa) para recuperação segura antes de preflight.

O piloto do plano01-07 pode iniciar `mise exec node@24.21.0 -- node dist/src/main.js serve --collect` apenas depois do preflight aprovado. O QR aparece somente na tela autenticada e precisa ser lido no celular. A identificação de protocolo usa Chrome com `syncFullHistory: true`; não executa navegador no coletor nem comprova entrega de histórico integral. A identificação Desktop foi recusada antes do QR no piloto local ([relato upstream correspondente](https://github.com/WhiskeySockets/Baileys/issues/2677)). Não há flag para dispensar a prova; cópia de outro perfil, recibo adulterado, snapshot removido/corrompido e diretório restaurado bloqueiam o coletor antes do socket. `serve` sem flag continua offline. Receber dados novos não invalida a prova inicial de recuperabilidade: ao acumular material, repita parada → backup em destino novo → verify-backup em destino novo → preflight → serve no perfil fonte. Não apague snapshots anteriores automaticamente. A cópia local ainda não é backup externo da VPS.
