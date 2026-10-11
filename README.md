# Zap MCP

Arquivo privado de WhatsApp com uma conta, um proprietário e um coletor, por dispositivo vinculado sem navegador.

## Status

A implementação técnica da fase1 está testada localmente; o piloto privado já vinculou a conta por QR e confirmou conexão e ingestão reais. O lote inicial observado contém 8.924 itens confirmados e 8.679 mensagens distintas, sem falhas de persistência após recuperar seis edições de grupo do diário recebido. Referências e IDs dos anexos anteriores foram preservados. Quatro originais reais do grupo conhecido — áudio, imagem, vídeo e documento — estão persistidos e conferidos por tamanho/hash de origem, download privado, restauração offline e novo acesso após reinício. O mesmo coletor reconectou sem novo QR. A fila mantém os demais originais pendentes ou indisponíveis com estado explícito; quatro amostras não comprovam toda a mídia. A comparação humana com o celular continua pendente; lote confirmado não garante histórico integral. A fase1 permanece aberta. VPS/domínio ainda não foram identificados. Busca, abas e exportação pertencem à fase2; MCP no Codex à fase3; operação e backup externo recorrente à fase4.

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

Abra http://127.0.0.1:3000, entre e consulte o acervo local. `serve` inicia com coletor desligado. Transporte aceita apenas loopback; não expor porta diretamente nem configurar proxy antes da preparação da fase4. Nenhuma superfície oferece envio, edição, exclusão ou confirmação de leitura no WhatsApp.

## Cópia e recuperação antes do piloto

Pare o serviço com Ctrl+C ou `kill -TERM PID_DO_SERVICO` e aguarde o processo encerrar. O encerramento suspende o coletor, cancela/drena streams e fecha bancos antes de liberar a trava. Backup recusa serviço ativo; nunca remova uma trava à força. Escolha destino novo, fora do perfil fonte e do checkout, com espaço para a cópia mais reserva de max(256MiB,5% do volume).

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
