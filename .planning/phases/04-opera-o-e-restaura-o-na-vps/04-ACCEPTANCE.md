# Aceite operacional real — fase 4

Execução nova concluída em **42min24,7s**, medida entre o início registrado da unidade privada e a gravação do recibo final. O driver validou **26/26 gates no mesmo processo vivo**, dentro do limite de uma hora; a unidade terminou com **status 0**. O recibo é `accepted: true`, `synthetic: false`, com OPS-01–04 `passed`. Os requisitos e a fase aguardam o verificador independente.

## Evidências atuais

| Critério | Resultado observado |
|---|---|
| OPS-01 | HTTPS permanente autenticado, restart real, atualização entre releases distintos, leitura offline e perfil preservado; 910 originais conferidos integralmente pelo endpoint |
| OPS-02 | Cópia cifrada externa produzida nesta atualização, recuperada, decifrada e restaurada com identidade independente fora da VPS; readback/ACK atuais |
| OPS-03 | Restauração em diretório novo, integridade/FK/schema/linhas/referências/FTS e todos os 910 originais iguais; clone sem coletor |
| OPS-04 | Chrome e Codex instalado atravessaram o caso real no permanente e no clone restaurado pelo mesmo HTTPS, com busca, contexto, originais e ZIP comparados a SQL/disco independentes |

O acervo restaurado desta execução contém **9.093 mensagens**, **9.543 registros de origem**, **1.897 registros de anexos** e **910 originais disponíveis**. As contagens descrevem o recebido; não representam histórico integral.

### Gates do driver

| Grupo | Gates observados |
|---|---|
| Operação | permanent, restart, update, offlineReading |
| Cópia externa | snapshotConsistency, externalReadback, independentKey |
| Restauração | cleanRestore, sqlIntegrity, foreignKeys, schema, counts, references, fts, allAvailableOriginalHashes, zeroCollector |
| Cliente e caso | installedCodex, permanentCodex, restoredCodex, negotiation, savedOriginals, siteRealCase, restoredRealCase, zipOracle |
| Preservação | configPreserved, cleanup |

O `WeakSet` e as observações privadas do processo produziram os gates. Este documento, arquivos JSON, recibos anteriores e booleans do caso não substituem essa validação.

### Chrome e Codex

Em ambos os backends, o Chrome encontrou um candidato por contato e **cinco resultados** com termo/período explícitos, abriu a âncora conhecida e baixou um original e um ZIP novos. Valores dos filtros foram conferidos no DOM. Os dois ZIPs passaram pelo oráculo independente: **140 mensagens, 13 arquivos incluídos e 3 faltantes explícitos**, além da página de busca; os originais baixados conferiram bytes/tamanho/hash contra SQL e disco da restauração atual. O marker do clone só foi gravado após o sucesso dessas verificações, com run/ready atuais, clone ativo e DONE ausente.

O **Codex CLI 0.162.1 realmente instalado** negociou protocolo **2025-06-18** em cada backend. Cada execução completou **oito chamadas MCP**, incluindo três janelas limitadas de contexto e dois pedidos de anexo; os quatro arquivos salvos no total conferiram contra os originais. A configuração permanente usa a referência privada `http_headers_helper`; os demais blocos/configurações foram preservados. O override temporário do clone não substituiu essa configuração. Negociação na interface gráfica do Codex Desktop não foi demonstrada.

### Cleanup e preservação

O finally enviou DONE, removeu somente o container do clone, restaurou o permanente offline e comparou o perfil. Antes de publicar o resultado, o helper privado aguardou HTTPS com TLS autorizado, login owner, status offline e logout revogado. Foram necessárias dez tentativas de prontidão; o gate posterior conservou a exigência de **401 para o token temporário** e comprovou a credencial permanente funcional. O envelope temporário da senha foi removido.

O timer próprio voltou exatamente a **active/enabled**, igual ao estado anterior. O fallback anterior ficou parado, sem restart, com rótulo de aplicação da plataforma e mesma imagem, mounts, env e UID; o backend permanente e o perfil continuaram preservados. Imagem/candidatos próprios receberam os rótulos necessários após a limpeza da plataforma ter removido candidatos antigos. Nenhuma regra global de limpeza ou aplicação de terceiros foi alterada.

## Validação e limites

- Suíte integrada atual: **315/315**, zero falhas, cancelamentos, skips ou TODO; duração medida de 68,461s.
- Revisões anteriores desta fonte: código clean, UI 24/24 e segurança 18/18 mitigações ASVS1. Esses controles complementam o aceite; não o substituem.
- Origem original permanece fenced/parada, com autostart desativado e dados preservados. A retomada do único coletor do destino será feita após a verificação independente.
- Não houve reboot completo da VPS. A unidade diária já executou um backup real; o próximo evento automático das 03h, America/Sao_Paulo, não é alegado como ocorrido. O notebook precisa estar ligado/conectado; Persistent e atraso observável permanecem condições operacionais.
- `edgeProbes` do serializador continuam `unresolved`; não foram convertidos em ausência de risco. O verificador deve avaliar o registro de ameaças, os controles negativos e as provas atuais.
- Os artefatos públicos desta entrega foram auditados separadamente. Não se afirma ausência absoluta de dados pessoais no histórico das ferramentas: um diagnóstico de UI e um erro de transporte emitiram detalhes privados indevidos, sem credencial; as observações posteriores foram limitadas a booleans/contagens.

Configurações, caso, recibos completos, fontes, hosts, paths, tokens, downloads e hashes pessoais permanecem no handoff privado fora do Git. Os ponteiros são entregues ao orquestrador pelo locator privado; este documento publica somente critérios, resultados, contagens, versões e limites.
