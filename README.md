# Zap MCP

Arquivo privado de WhatsApp com uma conta, um proprietário e um coletor, por dispositivo vinculado sem navegador.

## Status

As fases 1 e 2 locais estão concluídas e verificadas. O site oferece busca por contato, texto e período, contexto paginado, conversas em abas, preview sob ação e exportação integral do recorte arquivado em ZIP. A suíte integrada passou 143/143 testes; a verificação independente da fase 2 passou 40/40 critérios e 8/8 requisitos, sem gaps.

O aceite real conferiu 1.028 mensagens, 190 originais e 112 faltantes no recorte escolhido, preservando versões e citações; ambos ZIPs tiveram todas as 192 entradas e os hashes conferidos. A atualização local preservou senha, identidade e IDs, após snapshot/restore de 8.792 mensagens e 856 originais. Essas contagens são das cópias verificadas, sem garantia de histórico integral. [Evidências da fase 2](.planning/phases/02-busca-contexto-abas-e-exporta-o-no-site/02-VERIFICATION.md).

MCP no Codex pertence à fase 3; VPS, transporte protegido e backup externo recorrente à fase 4. A conexão autenticada atual do WhatsApp após o último reinício, zoom nativo e dispositivos físicos não foram revalidados. A leitura do material arquivado funciona offline.

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

O navegador auxiliar separado sofreu SIGSEGV de causa nativa não determinada e foi retirado do procedimento; não houve alteração global de Chromium. Use o Chrome normal para consultar o site. Campos desconhecidos e mídias não recuperadas permanecem explícitos. Detalhes e arquivos reais continuam privados fora do Git; VPS e MCP ainda não foram validados.

## Privacidade

O repositório público contém o código e os documentos do projeto. Mensagens reais, anexos, bancos, sessões de WhatsApp, credenciais e exportações devem permanecer no ambiente privado e fora do Git. As regras de exclusão estão em [.gitignore](.gitignore); todo material novo precisa respeitar essa separação.

## Uso local

Node24.21.0 é obrigatório, inclusive para o módulo SQLite. Com mise instalado:

```sh
mise exec node@24.21.0 -- npm ci
mise exec node@24.21.0 -- npm run build
mise exec node@24.21.0 -- npm test
export ZAP_DATA_DIR=/caminho/privado/zap
export ZAP_PORT=3000
mise exec node@24.21.0 -- node dist/src/main.js profile-init
read -rs -p 'Senha local: ' ZAP_OWNER_PASSWORD
printf '%s' "$ZAP_OWNER_PASSWORD" | mise exec node@24.21.0 -- node dist/src/main.js owner-set
unset ZAP_OWNER_PASSWORD
mise exec node@24.21.0 -- node dist/src/main.js serve
```

Escolha diretório privado fora do checkout; o caminho acima é fictício. `.env.example` documenta variáveis, mas `.env` não é carregado automaticamente. Senha passa por stdin, nunca por argumento/histórico. `owner-set` revoga sessões anteriores e exige serviço parado. `profile-init` cria somente credenciais locais offline; não substitui perfil corrompido e não conecta conta.

Abra http://127.0.0.1:3000, entre e consulte o acervo local. `serve` inicia com coletor desligado. Transporte aceita apenas loopback; não expor porta diretamente nem configurar proxy antes da preparação da fase 4. Nenhuma superfície oferece envio, edição, exclusão ou confirmação de leitura no WhatsApp.

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
