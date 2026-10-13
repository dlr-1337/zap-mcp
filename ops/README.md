# Inventário operacional privado

O plano 04-01 produz fatos atuais ou dependências explícitas. `blocked` é um inventário válido; não comprova VPS, backup externo ou requisitos OPS. Nenhum comando deste roteiro para o coletor, conecta WhatsApp, instala software ou altera o Codex.

Use Node24.21.0:

```sh
mise exec node@24.21.0 -- node scripts/phase4-environment.mjs --mode discover
mise exec node@24.21.0 -- node scripts/phase4-environment.mjs --mode assert-ready
mise exec node@24.21.0 -- node scripts/phase4-environment.mjs --mode self-test
```

`discover` retorna exit0 após gravar um recibo válido. Sem configuração, escolhe diretório temporário privado externo e lista as oito dependências no stdout. `assert-ready` repete os probes; exit0 exige todos os fatos observados nesta execução, com idade máxima de15min. Copiar, editar ou atualizar a data de um JSON antigo não libera operação. `self-test` usa somente fixtures e não conta como acesso real.

`ZAP_OPERATION_CONFIG_FILE` referencia JSON existente, owner-only0600, fora do checkout e sem symlinks. Seu `evidenceDir` precisa existir, ser externo, do mesmo proprietário e0700. O arquivo `environment.json` contém `version:1`, `runId`, `observedAt`, `status` e `dependencies`; provas integrais ficam nele em0600. Não publique esse diretório. Os argumentos nunca carregam credenciais; preserve as identidades SSH já existentes.

Contrato da configuração:

| Campo | Referências privadas necessárias |
|---|---|
| `source` | `kind:local` ou `ssh`, `machineId` conferido por canal existente, `dataDir`, `appRoot`; no SSH, campos abaixo |
| `target` | `kind:ssh`, `host`, `user`, `port` opcional, `machineId`, `dataDir`, `appRoot`, `identityFile`, `knownHostsFile` |
| `publicOrigin` | Origem HTTPS exata, sem credencial, query ou path |
| `proxy` | `kind:nginx` ou `caddy` já identificado, `configFile`, `expectedConfigDigest` de configuração previamente conferida para Host/peer/topologia; versões observadas precisam ser revalidadas antes de deploy |
| `supervisor` | `kind:systemd` existente, `unit` conhecida; probe confere estado, autostart, User e MainPID do processo do projeto |
| `persistentVolume` | `path`, `releaseRoot`; owner0700, mount gravável persistente, fora de release/appRoot |
| `capacity` | `queueZipBytes`, `queueZipFiles`: orçamento adicional para fila/ZIP, nunca tamanho antigo do acervo |
| `offsite` | Host SSH independente com identidade/chave/known-hosts existentes e `storagePath` |
| `recoveryKeyReference` | `host:offsite`, `path` de arquivo0600 independente; a ferramenta verifica somente metadata/acesso, sem ler segredo |

Não invente host nem aceite fingerprint desconhecido automaticamente. O SSH usa `-F /dev/null`, `BatchMode`, `StrictHostKeyChecking`, identidades explícitas e nenhum argv de comando fornecido pela configuração. A expressão remota é fixa e o payload serializado usa base64. Cada probe tem deadline10s e saída limitada; chamadas internas usam argv fixos, sem shell. A leitura da identidade é de `/etc/machine-id`; runtime/SQLite/FTS são exercitados em banco em memória. O processo de aplicação nunca é importado ou iniciado.

O cálculo usa metadata atual da origem, incluindo arquivos existentes, sem abrir mensagens/sessões/mídias: cinco vezes os bytes do acervo (acervo destino, snapshot novo, staging, readback e restore), mais orçamento fila/ZIP e reserva `max(256MiB,5% do subtotal)`. Inodes precisam cobrir cinco conjuntos, orçamento e32 entradas auxiliares. Volume cheio não autoriza apagar nada. Medições não prometem consistência de snapshot de origem ativa; remeça no preflight imediatamente anterior à operação.

O stdout usa allowlist de nomes/status/códigos; não contém host, path, hash, conteúdo, erro externo bruto ou chave. `missing` significa referência não informada; `unverified` significa prova incompleta ou falha atual, não indisponibilidade permanente. `configuration_invalid`, `probe_failed`, `runtime_unsupported`, `capacity_insufficient` indicam o campo/probe que precisa ser corrigido no recibo privado.

Atualmente nenhum backend externo/ferramenta cifrada foi identificado no ambiente disponível. Por isso o probe SSH do offsite mantém `target_offsite_access_unverified` até provar acesso direto desde a VPS sem notebook. A chave mantém `recovery_decryption_unverified` mesmo quando metadata e acesso independente passam: arquivo legível não prova chave correta, formato, versão nem decrypt. Não há adapter especulativo nem upload neste plano. Após identificar backend e ferramenta oficiais realmente disponíveis, os planos04-04/05/06 devem completar o probe correspondente, recuperar/decriptar e conferir a cópia real antes de qualquer aceite. As hipóteses A1/A2 continuam unresolved sem provas positivas.

Dependências para avançar remotamente: referência privada verificável da VPS e acesso, origem HTTPS com proxy existente/topologia conferida, supervisor e volume persistente, destino externo acessível diretamente pela VPS e kit/chave utilizável independentemente dela. Prepare essas referências por acesso/painel já autorizado; se uma autenticação depender do proprietário, indique exatamente o login/2FA necessário. As implementações locais dos planos04-02–04 continuam possíveis enquanto esses fatos não forem provados.

## Backup cifrado iniciado pelo notebook — contrato04-04

O inventário acima descreve o probe inicial04-01. A direção operacional posterior usa o notebook como destino externo já disponível: ele inicia um **pull SSH autenticado da VPS**. A VPS não precisa conectar ao notebook nem depende dele para iniciar/reconectar o coletor. Notebook desligado significa ausência de novo backup externo; o status mostra idade real, sem promessa de SLA. Outro storage sempre online exigirá inventário e uma decisão posterior, sem fallback silencioso nem contratação nesta versão.

Uma ferramenta: `/usr/bin/age` **1.3.2**, versão exigida antes de encrypt/decrypt. A instalação local foi feita pelo orquestrador com pacote Arch extra assinado e checksum/signatura verificados. Ainda é necessário disponibilizar a mesma versão verificada no produtor real; nada foi instalado na VPS por este plano. Consulte [documentação oficial age](https://github.com/FiloSottile/age) e [manual](https://filippo.io/age/age.1). Não baixar/executar uma versão alternativa automaticamente. ZIP usa yazl/yauzl já fixados no lock, sem pacote novo nem formato criptográfico próprio.

Configuração privada separada por máquina, JSON0600, diretórios0700 existentes fora do Git/release. `ZAP_OPERATION_CONFIG_FILE` aponta ao arquivo correspondente. Não inserir chaves/identidades, hosts ou paths reais neste documento. Não versionar o arquivo nem o kit. O runtime continua Node24.21.0.

| Papel | Campos concretos |
|---|---|
| VPS, `role:source` | Todos os campos `OperationConfig`04-03: dataDir, operationDir, destination (prefixo externo para snapshots exclusivos), priorMode, priorRelease, supervisor. Mais recipientFile, maxBytes, reserveBytes, maxFiles opcional |
| Notebook, `role:pull` | operationDir, destinationDir, identityFile (chave **age**, independente), maxBytes, reserveBytes, maxFiles opcional e remote |
| `remote` no notebook | host, user, port opcional22, identityFile (chave **SSH**, distinta), knownHostsFile previamente conferido, nodePath, mainPath e configFile absolutos no host produtor, dataDir da VPS |
| Estado autenticado na VPS | `ZAP_BACKUP_STATE_FILE` com o path privado `operationDir/offsite-state.json`; `serve` lê somente a allowlist. Arquivo ausente significa nenhum sucesso verificado, nunca ready |

`maxBytes` limita ciphertext e conteúdo ZIP integral; medir acervo e overhead antes de escolher. `maxFiles` limita entradas (default10000); medir originais e manifests. `reserveBytes` é reserva adicional, nunca reduz o mínimo `max(256MiB,5% do filesystem)`. Preflight mede metadata atual na VPS antes de stop; verifica orçamento, bytes e inodes. Notebook reserva até cinco conjuntos/bytes para incoming, readback, pacote, snapshot e restore. Ambos recusam capacidade insuficiente. Nenhum disco cheio autoriza apagar acervo, snapshots ou último bom.

Os paths remotos aceitam somente caracteres de path absolutos sem espaços, `..` ou metacaracteres. O executável Node/release e configuração são referências previamente conferidas pelo operador, não um comando livre. OpenSSH usa arquivo de configuração vazio, BatchMode, identidade explícita, StrictHostKeyChecking, known-hosts pinado, sem forwarding, sem atualização automática de host keys e sem stdin interativo. [Opções oficiais OpenSSH](https://man.openbsd.org/ssh_config). Nenhuma impressão de erro remoto bruto, chave, plaintext ou hash pessoal; stderr dos processos privados não é retransmitido. A chave age passa por fd3, nunca por argv; só recipient público fica na VPS.

Comandos de produto (o agente prepara e executa; não exigem operação manual de terminal pelo proprietário):

```sh
# Notebook; config role:pull; não precisa ZAP_DATA_DIR local
mise exec node@24.21.0 -- node dist/src/main.js offsite-backup
# Mesmo notebook, ID exato do estado privado, diretório de recuperação novo
mise exec node@24.21.0 -- node dist/src/main.js offsite-recover ID_IMUTAVEL DIRETORIO_PRIVADO_NOVO
```

O adapter invoca automaticamente na VPS `offsite-produce ID_IMUTAVEL` com ZAP_DATA_DIR e config source. O produtor usa mutex/journal04-03, stop/drain/snapshot/retomada segura **antes** da cifragem e transmissão. Snapshots são `destination-ID`; ciphertexts `operationDir/ID.age`, acompanhados de descriptor privado. A saída stdout deste comando contém somente ciphertext finalizado. Serviço retomado continua útil mesmo quando a rede falha.

No notebook, a transmissão usa temporário privado e publicação exclusiva por link/fsync em `destinationDir/ID.age`. O arquivo final é reaberto pelo **mesmo ID** e copiado por stream para readback novo; ciphertext/SHA conferidos, age decifra com a chave independente e a extração usa allowlist estrita. Rejeita paths arbitrários, diretórios/links/symlinks, duplicatas, entradas excedentes, replay de ID, orçamento excedido, conjunto e hashes divergentes. SQL integrity/FK/schema/contagens, FTS, perfil e **todos** os originais disponíveis são conferidos por validateSnapshot; restoreSnapshot cria clone offline novo. Nenhum coletor é iniciado no ensaio, nenhuma senha real é redefinida.

Somente depois dessa validação o notebook envia `offsite-ack` por SSH, JSON limitado4096bytes em stdin. A VPS compara ID/digest/data/ciphertext com o descriptor preparado e só então grava lastVerifiedSuccess atomicamente. ACK antigo não avança ponteiro de operação nova; ACK do mesmo sucesso é idempotente. `offsite-failed` envia somente ID interno/código de uma allowlist, sem detalhes privados; mantém último bom. Se nem essa comunicação for possível, a VPS permanece pending e a idade aumenta; o notebook conserva a falha concreta localmente.

Transferência: deadline120s por tentativa, no máximo três tentativas (inicial + dois retries), sempre com o mesmo ID. Cifragem, decrypt/readback e ACK têm deadline próprio; stop herda60s. Hash/validação SQL síncronos não constituem uma garantia de janela curta: medir duração com o acervo real. Retry de ciphertext preparado não repete parada. SIGKILL deixa estado pending/falha e temporários identificáveis; retomada exige revalidar o ID, não confiar no upload. Se link exclusivo foi publicado antes do descriptor, reconciliação associa apenas o snapshot original da intenção e **não** publica sucesso sem decrypt/readback/ACK. Journal04-03 de parada/retomada ambígua exige operation-recover; nunca remover trava manualmente. Não remover temporários de terceiros nem expurgar automaticamente artefatos antigos/corrompidos.

Status `/api/status` exige cookie do proprietário e contém backup: lastAttemptAt, lastVerifiedAt, snapshotCreatedAt, ageSeconds, overdue24h, result e safeFailureCode. Idade/RPO usa **snapshotCreatedAt**; um upload de snapshot antigo não reduz atraso. `overdue24h` é true sem sucesso ou acima24h. Tentativa e agenda não atualizam sucesso. Não expõe ID, caminho, host, hash, chave ou erro externo. Falha de backup não derruba consulta. Estado inválido é failed/state_invalid.

## Rotina diária e recovery kit

Instalar agenda no **notebook** em04-05: diária America/Sao_Paulo, horário escolhido depois da medição, catch-up ao ligar/reiniciar e tentativas limitadas. Notebook desligado por mais24h é degradação mensurada, não um serviço sempre disponível. Não há agenda instalada por04-04. Antes de migração/update, disparar pull e exigir novo lastVerifiedSuccess e recuperação completa; se notebook indisponível, adiar a atualização com fallback íntegro e consulta preservada. Não confundir snapshot local pré-update com sucesso offsite.

Kit independente protegido fora da VPS: identidade age0600, recipient público, versão/instalação verificável de age1.3.2 e release/lock Node, config de pull/known-hosts/acesso SSH e cópia cifrada por ID. Guardar também a chave privada original SourceSigner em local protegido **fora da VPS**; nunca incluir `source-fence-key.json` no produtor. Perder tanto notebook quanto VPS continua fora da proteção de duas máquinas; a evidência real deve explicitar isso.

Quando há promoção ativa, o pacote cifrado inclui `recovery/` separado de `snapshot/`: promotion-receipt, promotion-state, promotion-key, signed fence e public anchor herdados. Estes arquivos têm hashes no metadata cifrado. `recoveryFiles` pode indicar explicitamente os mesmos nomes permitidos, com referências privadas; nenhum outro nome/path é aceito. Não inclui a chave privada SourceSigner. Prova/public anchor conservados não autorizam coletor numa nova máquina/path: restaurar primeiro para consulta offline e executar uma nova promoção/fencing coerentes com04-03. Nunca copiar autorização para burlar gate nem iniciar segundo coletor.

Conferir recuperação usando **identityFile do kit independente**, ID imutável e destino limpo; revisar SQL/FTS/IDs/originais e consultar clone offline. Nenhum requisito OPS é concluído por teste sintético, pacote presente, agendamento ou descriptor. A rodada real exige produtor/tool/supervisor/acesso SSH reais, cópia do acervo recebida no notebook, decrypt com kit e restore integral em04-05/06. Falhas preservam os snapshots e último bom; não existe `latest`, sobrescrita, autopurge ou garantia WORM contra um administrador do filesystem.
