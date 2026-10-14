# Operar o Zap MCP

Este guia cobre instalação em servidor, HTTPS, backup externo e recuperação. Para começar localmente, siga o [README](../README.md#instalação-local). Todos os domínios, caminhos e identificadores abaixo são exemplos: substitua-os pelos valores conferidos no seu ambiente.

## Arquivo privado e configuração

Mantenha o perfil, configurações operacionais, snapshots e chaves fora do checkout e dos releases. Diretórios privados usam `0700`; arquivos usam `0600` e pertencem ao usuário que executa a operação. Configurações e chaves não podem ser symlinks. O serviço deve ter um usuário dedicado, sem acesso a arquivos de outros serviços.

| Variável | Finalidade |
|---|---|
| `ZAP_DATA_DIR` | Caminho absoluto do perfil, com bancos, sessão e mídia. |
| `ZAP_PORT` | Porta do backend; padrão `3000`. |
| `ZAP_BIND_HOST` | Padrão `127.0.0.1`; `0.0.0.0` somente em rede privada com proxy configurado. |
| `ZAP_PUBLIC_ORIGIN` | Origem HTTPS canônica, sem barra final ou caminho. |
| `ZAP_TRUSTED_PROXY_PEERS` | IPs exatos dos peers do proxy, separados por vírgula, sem espaços ou CIDR. |
| `ZAP_OPERATION_CONFIG_FILE` | JSON privado da operação atual: backup, promoção, inventário ou deploy. Cada comando exige seu próprio contrato. |
| `ZAP_BACKUP_STATE_FILE` | Estado privado do backup externo, disponibilizado somente para leitura pelo site. |

A aplicação não carrega `.env`. Exporte as variáveis ou configure-as no supervisor. O arquivo [`.env.example`](../.env.example) é uma referência; o Compose faz sua própria interpolação de variáveis.

## HTTPS e proxy

O backend aceita loopback local ou um proxy explicitamente confiável. Para acesso remoto, configure **as duas** variáveis de origem e peers, mantenha o backend privado e termine TLS no proxy:

```bash
export ZAP_PUBLIC_ORIGIN=https://archive.example.test
export ZAP_TRUSTED_PROXY_PEERS=127.0.0.1
```

Use o IP real do socket que chega ao backend, não o IP do navegador nem uma quantidade de saltos. Na rede Docker, ele pode ser diferente de loopback e precisa ser medido novamente após mudanças de topologia.

O proxy deve preservar o `Host` da origem canônica, definir exatamente `X-Forwarded-Proto: https` e remover `Forwarded` e os demais `X-Forwarded-*`. Cabeçalhos duplicados, cadeias, origem divergente ou peer desconhecido recebem `403`. Cookies remotos usam `Secure`; login e exportação continuam protegidos por CSRF. Site, QR, mídia, exportações e MCP exigem suas respectivas autenticações.

Antes de liberar a rota, confira TLS válido, login e consulta autenticada. Verifique também que pedidos anônimos para dados, QR, anexos e MCP são recusados. Nunca resolva uma falha de proxy ampliando confiança para toda a rede.

## Docker e supervisão

```bash
docker build --tag zap-mcp:local .
```

O [Dockerfile](../Dockerfile) fixa Node 24.21.0 por digest, valida o lock inteiro no registro npm, instala sem lifecycle automático e compila explicitamente `better-sqlite3`. O build confere SQLite FTS5 e imports da aplicação; o runtime usa UID/GID **12001:12001**. As ferramentas de compilação ficam apenas no primeiro estágio.

O [Compose de exemplo](compose.example.yml) descreve uma implantação com Traefik já existente. Ele **não prepara sozinho** domínio, certificados, usuário, perfil, autorização de promoção, supervisor ou backup. Prepare esses recursos antes de iniciar o serviço. Um perfil novo deve ser inicializado e ter backup conferido pelo usuário dedicado; migrar um perfil existente exige o procedimento de promoção abaixo.

Renderize o Compose em uma pasta privada. Configure:

| Grupo | Variáveis exigidas |
|---|---|
| Release | `ZAP_IMAGE_DIGEST` com imagem imutável e `ZAP_RELEASE_COMMIT` com commit exato. |
| Perfil | `ZAP_DATA_DIR`, `ZAP_OPERATION_DIR`, `ZAP_BACKUP_STATE_FILE`, `ZAP_SNAPSHOT_ROOT` e `ZAP_ARCHIVE_LABEL`. |
| Proxy | `ZAP_PUBLIC_ORIGIN`, `ZAP_TRUSTED_PROXY_PEERS`, `ZAP_HOST`, `ZAP_PROXY_NETWORK` e `ZAP_TLS_CERTRESOLVER`. |

Valide com `docker compose -f CAMINHO_PRIVADO/compose.yml config --quiet`. O exemplo inicia **offline**. Ele não publica portas, não monta o socket Docker e usa filesystem raiz somente leitura, sem capabilities e com `no-new-privileges`.

O volume do perfil pertence a `12001:12001`, é privado e usa o mesmo caminho absoluto no host e no container. `/etc/machine-id` é montado somente para leitura; snapshots referenciados por uma promoção também usam o mesmo caminho absoluto e mount somente leitura. O modo `pid: host` permite validar a trava por PID/starttime/bootId: considere esse requisito ao escolher o ambiente, e não remova os guards para adaptar a imagem.

### Controle limitado de containers

O helper [zap-container-control.mjs](zap-container-control.mjs) permite ao usuário dedicado inspecionar, parar e iniciar somente releases autorizados do Zap. Instale uma cópia root-owned `0755` em `/usr/local/libexec/zap-container-control`, com Node 24 verificado no shebang e ancestrais não graváveis por grupo/outros.

Sua configuração fica em `/etc/zap-mcp-control/config.json`, root-owned `0600`, dentro de diretório `0700`. Campos: `uid`, `machineId`, `dataDir`, `appLabel`, releases autorizados e, para proxy, nome real do Traefik, rede, peer, origem e labels exclusivos. Confira o contrato no helper; não use nomes de containers presumidos.

Autorize no sudoers **somente esse executável**, sem permissão genérica para Node, Docker ou shell. O helper aceita `inspect`, `inspect-runtime`, `stop`, `start COMMIT offline|collect` e, quando configurado, `start-boot`. Ele confere caller, imagem/release, volumes, processo e exclusividade antes de agir.

Prepare candidatos offline/collect e fallback parados com restart desabilitado. Evite rolling deploy e autodeploy que possam iniciar dois escritores. O supervisor host retoma somente o estado autorizado e conferido; valide stop/start, modo, release e autostart no ambiente real. Em Coolify, candidatos e imagens precisam das classificações de aplicação gerenciada exigidas pela limpeza da plataforma; preserve o fallback e não altere a limpeza global de outros serviços.

## Backup local e restauração

Pare o serviço com SIGTERM ou Ctrl+C e aguarde seu encerramento. Não copie bancos ativos manualmente nem remova travas. Com o `ZAP_DATA_DIR` original definido, use destinos novos em diretórios privados já existentes:

```bash
node dist/src/main.js backup /caminho/privado/snapshots/copy-002
node dist/src/main.js verify-backup /caminho/privado/snapshots/copy-002 /caminho/privado/restores/check-002
node dist/src/main.js preflight
```

O snapshot inclui bancos SQLite consistentes, estado necessário da sessão e originais disponíveis com manifests e hashes. Conteúdo pendente continua indicado como pendente. O backup exige espaço para a cópia mais reserva de `max(256 MiB, 5% do volume)`; falha nunca autoriza apagar o acervo ou o último backup bom.

Para recuperar **somente leitura**, use outro destino inexistente:

```bash
node dist/src/main.js restore /caminho/privado/snapshots/copy-002 /caminho/privado/restores/read-002
ZAP_DATA_DIR=/caminho/privado/restores/read-002 node dist/src/main.js serve
```

Esse clone conserva a senha original e permanece offline. A cópia de `verify-backup` usa uma senha efêmera para testar login; use `restore` para consulta pessoal. Restaurar a sessão não prova sua validade remota e não autoriza outro coletor. Não apague snapshots referenciados por recibos de coleta ou promoção.

## Backup externo cifrado

O destino externo inicia um **pull SSH da VPS**. Ele pode ser um notebook Linux: a coleta continua quando ele está desligado, mas não haverá backup externo novo. O site mostra a idade real da última cópia verificada. Um destino sempre online deve ser preparado explicitamente.

Instale **age 1.3.2** em `/usr/bin/age` e `/usr/bin/age-keygen` nos hosts que executam esses comandos, e confira a versão. Guarde a chave privada age fora da VPS; na VPS fica somente o recipient público. A chave SSH e a chave age são arquivos distintos. Confira o host SSH por canal independente e mantenha `known_hosts` pinado; o adapter não aceita fingerprint automaticamente.

### Configuração do produtor na VPS

O JSON privado de `role: source` combina o contrato de snapshot com orçamento e recipient:

| Campos | Conteúdo |
|---|---|
| `dataDir`, `operationDir`, `destination` | Perfil, journal externo e prefixo privado dos snapshots. |
| `priorMode`, `priorRelease` | Modo `offline`/`collect` e release que devem ser retomados. |
| `supervisor` | `kind: systemd` ou `docker`, `name`, `dataDir`, `machineId`; systemd pode usar `user: true`. Docker controlado usa `helperPath` e `release` autorizado. |
| `recipientFile` | Arquivo privado com o recipient público age. |
| `maxBytes`, `reserveBytes`, `maxFiles` | Orçamentos em bytes e entradas; `maxFiles` padrão é 10000. |

Diretórios precisam existir e pertencer ao usuário operacional. O `operationDir` fica fora do perfil; `supervisor.dataDir` deve apontar ao mesmo perfil. Supervisor e usuário devem permitir parada e retomada verificáveis. Meça espaço/inodes antes de escolher os orçamentos; o destino externo reserva capacidade para vários conjuntos de trabalho.

Configure `ZAP_BACKUP_STATE_FILE` no site com `operationDir/offsite-state.json` do produtor, montado somente para leitura. A configuração operacional usada pelo SSH não deve ser exposta ao container do site.

### Configuração do destino externo

Exemplo de JSON `0600`, fora do Git; substitua os valores e prepare os diretórios `0700`:

```json
{
  "role": "pull",
  "operationDir": "/caminho/privado/pull-state",
  "destinationDir": "/caminho/privado/backups",
  "identityFile": "/caminho/privado/age-identity.txt",
  "maxBytes": 10737418240,
  "reserveBytes": 1073741824,
  "maxFiles": 10000,
  "remote": {
    "host": "vps.example.test",
    "user": "archive-owner",
    "port": 22,
    "identityFile": "/caminho/privado/ssh-identity",
    "knownHostsFile": "/caminho/privado/known_hosts",
    "nodePath": "/caminho/node24/bin/node",
    "mainPath": "/caminho/release/dist/src/main.js",
    "configFile": "/caminho/privado/source-backup.json",
    "dataDir": "/caminho/privado/profile"
  }
}
```

Os caminhos em `remote` são da VPS, absolutos e sem espaços/metacaracteres; os demais são do destino externo. Os números são exemplos de limites, não uma medição do seu acervo. Os contratos completos estão em [offsite.ts](../src/offsite.ts) e [operation.ts](../src/operation.ts).

No destino externo:

```bash
export ZAP_OPERATION_CONFIG_FILE=/caminho/privado/pull-backup.json
node dist/src/main.js offsite-backup
node dist/src/main.js offsite-recover ID_DO_BACKUP /caminho/privado/restores/offsite-001
```

Selecione o ID no estado privado do backup. `offsite-backup` coordena parada/snapshot/retomada na VPS, recebe o pacote cifrado, reabre o mesmo ID, decifra e restaura isoladamente. Só depois da conferência SQL, FTS, sessão e originais envia o ACK que atualiza o sucesso na VPS. Um upload, arquivo presente ou timer ativo não comprova recuperação.

Cada execução usa ID imutável e preserva o último bom. Falhas de rede têm tentativas limitadas. `transferTimeoutMs` opcional aceita 1000–900000 ms; o padrão é 120000 ms e vale para transporte do ciphertext. Operação interrompida exige reconciliação pelo journal; não apague travas ou reinicie uma migração às cegas.

### Agenda e kit de recuperação

Crie um serviço oneshot no destino externo com Node, release e configuração privados, e um timer systemd com `Persistent=true`. Um exemplo de horário é `OnCalendar=*-*-* 03:00:00 America/Sao_Paulo`. Valide com `systemd-analyze calendar` e `systemd-analyze verify`, confira `list-timers` e execute um backup com recuperação e ACK antes de confiar na agenda.

Guarde fora da VPS: chave age, recipient, cópia cifrada, acesso SSH/known-hosts e versões/configurações para recuperação. Uma promoção também exige conservar sua chave privada de assinatura da origem em local independente; não envie essa chave à VPS. O pacote inclui somente os arquivos de recuperação permitidos, nunca a chave privada da origem.

O status autenticado mostra tentativa, último sucesso verificado, instante do snapshot e atraso acima de 24 horas. A idade usa o instante do snapshot; reenviar uma cópia antiga não reduz o atraso. A perda simultânea da VPS e do único destino externo exige uma terceira cópia para ser coberta.

## Migração e atualização

Migração de uma conta existente exige parar e inibir a origem, conferir ausência de escritor, emitir o bloqueio durável assinado (**fence**), copiar um snapshot final e promover somente o destino autorizado. Comece por consulta offline e valide backup externo antes de habilitar seu único coletor. Uma sessão inválida pode exigir novo QR; copiar arquivos não dispensa promoção ou comprova reconexão.

O driver `scripts/phase4-deploy.mjs` mantém esse processo e as atualizações com journal privado. Seu nome é legado; ele é uma ferramenta de operação, não um plano. Use `ZAP_OPERATION_CONFIG_FILE` com configuração própria do driver:

| Grupo | Campos |
|---|---|
| Operação | `version: 1`, `operationDir`, `environmentFile`, `pullConfigFile`, `ownerPasswordFile`, `publicOrigin`. |
| Compatibilidade | `priorRelease`, `candidateRelease`, `archiveSchema`, `authSchema`, medidos no perfil atual. |
| Destino | `target` com SSH pinado, `machineId`, `dataDir`, `appRoot`, `nodePath`, `helperPath`, `snapshotDir`, `promotionConfigFile`. |
| Migração | `sourceConfigFile` e `sourceFencePublicKey` conferidos; `rotateOwnerOnMigration: true` somente se for necessário criar uma nova senha no destino. |

O inventário `scripts/phase4-environment.mjs --mode discover` produz recibo privado dos recursos disponíveis; `--mode assert-ready` exige observações atuais. Configuração ausente ou probe falho não é ambiente pronto. Consulte os validadores dos scripts para os contratos específicos de proxy, supervisor, capacidade e destino externo.

```bash
node scripts/phase4-deploy.mjs --mode preflight
node scripts/phase4-deploy.mjs --mode migrate # somente ao migrar a origem preparada
node scripts/phase4-deploy.mjs --mode update  # somente com candidato e fallback preparados
node scripts/phase4-deploy.mjs --mode recover # reconciliação da troca de release
```

O update exige backup externo novo e recuperável antes da parada, compara o perfil atual, testa o candidato offline por HTTPS e retoma o modo autorizado. Recuperação de release troca **somente código**, mantendo registros posteriores ao backup; schema incompatível ou estado ambíguo deixam o arquivo offline para reconciliação. `operation-recover` é o comando separado para journals de snapshot, com configuração operacional correspondente.

Após qualquer mudança, confira consulta autenticada, originais, exclusividade, release/mode e backup recuperável. Mantenha dados, configs, chaves, journals e evidências integrais privados; não os envie em issues, logs públicos ou no Git.
