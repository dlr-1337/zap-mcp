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
