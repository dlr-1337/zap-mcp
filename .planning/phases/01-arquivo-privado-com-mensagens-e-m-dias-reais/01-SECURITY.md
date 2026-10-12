---
phase: "01"
slug: arquivo-privado-com-mensagens-e-m-dias-reais
status: verified
threats_open: 0
threats_total: 17
asvs_level: 1
register_authored_at_plan_time: true
created: "2026-10-11"
---

# Fase1 — verificação das mitigações planejadas

Auditoria de nível1 conforme registro STRIDE já escrito nos sete planos. Mitigações presentes nos pontos indicados e testes verdes conferidos;17 ameaças únicas fechadas, zero abertas no limiar high. Aplicado short-circuit documentado de secure-phase: registro autorado no planejamento, ASVS1 e zero ameaças abertas dispensam auditor profundo. Isso não afirma certificação ASVS, ausência de vulnerabilidades ou segurança da futura exposição externa.

## Fronteiras

Navegador→HTTP: sessão e entradas não confiáveis validadas. WhatsApp→coletor→arquivo: origem/identidade/alterações preservadas, sessão acessível somente ao coletor. Banco→disco/backup: escritor único, finalização e integridade. Runtime→Git/log/DTO: allowlist, logger silencioso e provas privadas fora do checkout.

## Registro de ameaças

| Threat ID | Categoria | Componente | Severidade | Disposition | Mitigação/evidência | Status |
|---|---|---|---|---|---|---|
| T-1-01 | S/E | login/sessão | high | mitigate | src/auth.ts:11/58/59/66/74/95; auth.test.ts — scrypt, sessão, rotação, TTL, revogação, CSRF e limite;13 testes atuais pass | closed |
| T-1-02 | I | armazenamento/HTTP | high | mitigate | src/main.ts:23/42/47/50; .gitignore; auth/security.test.ts —0700/0600, loopback/Host, no-store e DTO allowlist | closed |
| T-1-03 | T/R | ingestão/origins/revisões | high | mitigate | src/archive.ts:156/167/255/304; archive/coverage/revisions.test.ts — transação, journal, identidades e projeção conservadora;12+29 verificações atuais | closed |
| T-1-04 | I/E | viewOnce/quote/DTO | high | mitigate | src/archive.ts:40/55/65/70/307; revisions/coverage.test.ts — viewOnce restrito antes da serialização/DTO, inclusive quote | closed |
| T-1-05 | T/D | auth/single writer | high | mitigate | src/whatsapp.ts createAuthState/acquireServiceLock; auth-state/collector.test.ts —dez categorias transacionais, rollback e exclusividade | closed |
| T-1-06 | I | QR/socket | high | mitigate | src/whatsapp.ts:100/143; src/main.ts:60/85; collector/security.test.ts — logger silent, QR privado/efêmero por geração | closed |
| T-1-07 | E/T | operações remotas/reconnect | high | mitigate | src/whatsapp.ts superfície encapsulada; readonly/collector.test.ts — operações só consulta e reconnect limitado;13 testes atuais pass | closed |
| T-1-08 | T/I | mídia/caminhos/origem | high | mitigate | src/media.ts:115/139/142/189/235/238; media.test.ts —destino/redirect/DNS público, IDs internos e integridade | closed |
| T-1-09 | D/T | fila/stream/disco | high | mitigate | src/media.ts fila/reconcile; recovery.test.ts —stream, concorrência, tentativas, reserva, ENOSPC e crash sem expurgo | closed |
| T-1-10 | I/E | HTTP IDs/HEAD/Range | high | mitigate | src/main.ts:60–82 e openVerifiedAttachment; security/media.test.ts —gate antes de lookup, path/symlink, HEAD/Range;13 testes atuais pass | closed |
| T-1-11 | T/E | DOM/anexos | high | mitigate | public/app.js addText/textContent e signedOut; src/main.ts:50/77; security/readonly/UI —CSP, attachment e sessão;13 testes atuais pass | closed |
| T-1-12 | I | logs/respostas/cache | high | mitigate | src/archive.ts:342/362; src/whatsapp.ts:100; src/main.ts erros/no-store; security.test.ts sentinelas e logout;13 testes atuais pass | closed |
| T-1-13 | I/T | snapshot/restore | high | mitigate | src/backup.ts:17/90/123/230; backup/recovery.test.ts —exclusividade, WAL, manifest/hash, destinos novos e paths recusados; restore real8.684/828 | closed |
| T-1-14 | T/D | gate/segundo coletor | high | mitigate | src/backup.ts:156/202/220; src/main.ts coletor default off; recovery.test.ts —recibo ligado ao perfil e clone recusado antes de socket | closed |
| T-1-15 | I | evidência/piloto | high | mitigate | 01-07-CHECKPOINT/SUMMARY; .gitignore; evidências privadas externas e diff agregado —nenhum QR/chave/conteúdo real publicado | closed |
| T-1-16 | T/D | piloto/restart/restore | high | mitigate | 01-07-SUMMARY; src/backup.ts:202; restore real com fonte parada8.684/828, único coletor reiniciou sem QR, quatro originais preservados | closed |
| T-1-SC | Tampering | npm installs | high | mitigate | package-lock.json e01-01-SUMMARY: pins/registry/gitHead/tag/scripts/import/ABI/advisory conferidos antes da instalação; nenhuma dependência adicionada neste incremento | closed |

## Riscos aceitos

Nenhum risco novo aceito para fechar uma ameaça. Baileys não oficial/prerelease e cobertura parcial permanecem limites explícitos do produto. Cookie sem Secure é restrito ao loopback HTTP atual; HTTPS/proxy e seus controles devem ser verificados na fase4 antes de exposição. MCP/exportação são verificados em suas fases antes de existirem.

## Sign-off

- [x]17 ameaças com disposition mitigate e mitigações observadas.
- [x] Nenhuma ameaça encerrada por aceitação tácita.
- [x] threats_open:0 e status:verified.
- [x] Build atual e13 testes de auth/HTTP/security/readonly passaram, zero skips/falhas; suíte anterior86/86 não repetida por esse controle.

Approval: verified2026-10-11, escopo local da fase1.

## Security Audit 2026-10-11

| Metric | Count |
|---|---|
| Threats found | 17 |
| Closed | 17 |
| Open | 0 |
