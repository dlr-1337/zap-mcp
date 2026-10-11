---
phase: 01-arquivo-privado-com-mensagens-e-m-dias-reais
fixed_at: 2026-10-11T01:47:35Z
review_path: .planning/phases/01-arquivo-privado-com-mensagens-e-m-dias-reais/01-REVIEW.md
fix_scope: critical_warning
iteration: 1
findings_in_scope: 1
fixed: 1
skipped: 0
status: all_fixed
---

# Fase 1: relatório de correção WR-02

**Resumo:** 1 achado em escopo, 1 corrigido, 0 ignorados. Iteração 1 desta revisão incremental. O ledger `01-REVIEW-DISPOSITION.md` e os relatórios anteriores no Git permanecem preservados.

## Fixed Issues

### WR-02: teste de DNS aceita falha antes de exercitar o lookup

**Status:** fixed
**Arquivo modificado:** `test/media.test.ts`.
**Commit:** `f277bdfa2ee07af20307b915a194ff0a637cf141` — `fix(01): make DNS regression deterministic`.

**Correção aplicada:** o teste executa um subprocesso Node24, intercepta `node:https.request` antes de importar o dispatcher real e injeta um resolver com IPv4 público sintético. Exige exatamente uma requisição, `options.family=4`, `agent=false`, uma chamada ao resolver e ao lookup fixado e callback `[null, '8.8.8.8', 4]`. O transporte não abre socket: termina com um objeto de erro sintético cuja identidade precisa ser a causa da rejeição do fetch. O subprocesso deve terminar com código zero e marcador exato de sucesso. Timeout, rejeição arbitrária ou saída prematura não satisfazem o contrato. Nenhuma fonte de produção foi modificada.

## Verificação

Todos os comandos usaram `mise exec node@24.21.0`; nenhuma dependência foi instalada ou alterada.

- **Leitura/estrutura:** trecho alterado relido, contexto intacto e `git diff --check` sem erros.
- **Build no worktree isolado:** `mise exec node@24.21.0 -- npm run build` passou.
- **GREEN focado no worktree isolado:** `mise exec node@24.21.0 -- node --test --test-name-pattern='dispatcher passa family=4' dist/test/media.test.js`: **1/1**, zero falhas, skips ou cancelamentos.
- **RED por mutação em memória:** o mesmo script do teste compilado foi executado com `node:module.registerHooks`; apenas a ocorrência `agent: false, family: 4, lookup:` do módulo compilado foi substituída por `agent: false, lookup:` durante a carga, conferindo uma única ocorrência. Sem editar fonte ou artefato, o subprocesso terminou com **código 1**, `AssertionError [ERR_ASSERTION]: request deve fixar family=4`, `undefined !== 4`; o marcador de sucesso não apareceu. O harness exigiu esse código e essa mensagem específicos, terminando com `DNS_FAMILY4_MUTATION_DETECTED_IN_MEMORY`.
- **Suíte no worktree isolado:** uma execução de `mise exec node@24.21.0 -- npm test` (inclui build) resultou **81/82**, zero skips/cancelamentos; o teste novo passou. Falha em `UI HTTP vazia, texto hostil e janelas com cursor estável sem coletor`: resposta inicial 500 em vez de 200. O caminho do worktree sob `.claude/` é um ancestor oculto recusado pelo `sendFile`; os assets estavam presentes.
- **Gate no checkout principal:** após integração `--ff-only`, uma execução de `mise exec node@24.21.0 -- npm test` (inclui build) passou **82/82**, zero falhas, skips ou cancelamentos, em **13.716 s**. O teste UI acima passou, confirmando a limitação ambiental do caminho oculto sem mudança de fonte. A repetição foi necessária por essa falha específica de ambiente; não houve repetição ritual da suíte.
- Worktree, branch temporário e sentinel removidos na ordem transacional após fast-forward. Dependências principais intactas; nenhum symlink ou instalação foi criado.


### Reprodução exata da mutação

Após `mise exec node@24.21.0 -- npm run build`, executar da raiz do projeto:

```bash
mise exec node@24.21.0 -- node --input-type=module <<'JS'
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const testUrl = new URL('./dist/test/media.test.js', import.meta.url);
const text = readFileSync(testUrl, 'utf8');
const start = text.indexOf('const source = `', text.indexOf("test('dispatcher passa family=4"));
const end = text.indexOf('\n    const child =', start);
assert.ok(start >= 0 && end > start);
const expression = text.slice(start + 'const source = '.length, end).trim().replace(/;$/, '').replaceAll('import.meta.url', JSON.stringify(testUrl.href));
const contract = eval(expression);
const target = new URL('./dist/src/media.js', import.meta.url).href;
const hook = `
import { registerHooks } from 'node:module';
registerHooks({ load(url, context, nextLoad) {
  const result = nextLoad(url, context);
  if (url !== ${JSON.stringify(target)}) return result;
  const source = String(result.source);
  const needle = 'agent: false, family: 4, lookup:';
  assert.equal(source.split(needle).length, 2, 'mutação única do request');
  return { ...result, source: source.replace(needle, 'agent: false, lookup:') };
} });
`;
const child = spawnSync(process.execPath, ['--input-type=module', '-e', hook + contract], { encoding: 'utf8' });
assert.equal(child.error, undefined);
assert.equal(child.status, 1);
assert.match(child.stderr, /request deve fixar family=4/);
assert.match(child.stderr, /undefined !== 4/);
assert.doesNotMatch(child.stdout, /DNS_LOOKUP_FAMILY4_SEM_REDE_OK/);
console.log('DNS_FAMILY4_MUTATION_DETECTED_IN_MEMORY');
console.log(child.stderr);
JS
```

Esse harness termina com código zero somente ao confirmar o código 1 e a mensagem da assertiva específica do subprocesso mutado. O código de produção e o arquivo compilado permanecem intactos.

## Limites

Esta prova é sintética, sem acesso à conta, rede externa ou serviços privados. A comparação humana com o WhatsApp no celular permanece pendente: conversa individual conhecida, grupo, direções/autoria e quatro originais. Não comprova cobertura da conta, VPS/domínio, backup externo ou MCP no Codex real e não encerra a fase.

Relatório sem commit para o orquestrador. Apenas o teste está no commit; `REVIEW.md`, `STATE.md`, `ROADMAP.md`, ledger, `milestone.lock`, dados e serviços privados não foram modificados.

---
_Fixer: gsd-code-fixer_
_Iteration: 1_
