# Contribuir com o Zap MCP

Use dados sintéticos nos testes e exemplos. Não inclua mensagens reais, bancos, mídia, QR, sessão, tokens, senhas ou configurações de servidor em commits, issues ou pull requests.

## Estrutura

| Diretório | Responsabilidade |
|---|---|
| `src/` | Coleta, arquivo SQLite, autenticação, mídia, exportação, MCP e operações de backup/promoção. |
| `public/` | Interface do site em HTML, CSS e JavaScript. |
| `test/` | Testes automatizados com fixtures isoladas. |
| `scripts/` | Aceite do site/MCP/operação, inventário e driver de deploy. Os nomes `phase2`, `phase3` e `phase4` são legados; os scripts continuam utilizados pelos testes e operações. |
| `ops/` | Docker/Compose, controle limitado de containers e pins de dependências. |

A aplicação usa TypeScript ESM e Node 24.21.0. Mensagens e anexos vêm do acervo persistido; site, exportações e MCP compartilham as mesmas regras de consulta e privacidade. Somente o coletor possui acesso ao socket WhatsApp.

## Preparar os testes

A suíte usa Linux, Node 24.21.0, npm, Python 3, OpenSSL e OpenSSH (`ssh`, `ssh-keygen` e `sshd`). Testes de backup exigem **age 1.3.2** e `age-keygen` em `/usr/bin`; os testes de interface usam **Playwright 1.62.1** e o Chromium distribuído com essa versão. Nenhuma conta WhatsApp ou acesso à VPS é necessário.

Instale as ferramentas de sistema pela sua distribuição. Para os fixtures OpenSSH, `/run/sshd` precisa existir com proprietário root e permissão `0755`; um administrador pode prepará-lo com `sudo install -d -o root -g root -m 0755 /run/sshd`. Esse passo não inicia um servidor SSH permanente. O fixture do servidor SSH também exige execução como root ou `sudo -n` disponível; sem esse acesso, o teste correspondente é pulado.

Playwright é uma ferramenta de teste instalada separadamente, fora do projeto. A aplicação não depende de navegador:

```bash
node ops/verify-dependencies.mjs
npm ci
export ZAP_TEST_ROOT="$(mktemp -d)"
npm install --prefix "$ZAP_TEST_ROOT" --no-save --package-lock=false playwright@1.62.1
"$ZAP_TEST_ROOT/node_modules/.bin/playwright" install chromium
export ZAP_BROWSER_MODULE="$ZAP_TEST_ROOT/node_modules/playwright/package.json"
node --check public/app.js
npm test
```

Instale também as bibliotecas de sistema necessárias ao navegador; em ambientes Debian/Ubuntu compatíveis, o instalador Playwright aceita `install --with-deps chromium`. `ZAP_BROWSER_EXECUTABLE` é opcional para indicar outro caminho do mesmo Chromium; sem ela, o harness usa o navegador padrão do Playwright.

O [CI](.github/workflows/ci.yml) prepara Node, age, navegador e OpenSSH antes de executar a mesma suíte. Um teste focado pode ser executado depois de `npm run build`, por exemplo:

```bash
node --test dist/test/backup.test.js
```

Fixtures geram chaves, bancos e certificados temporários em diretórios privados. Testes sintéticos comprovam comportamento local; não comprovam cobertura da conta real, validade remota da sessão ou backup do seu servidor. Os scripts de aceite real exigem casos privados preparados pelo operador e não devem ser usados com dados anexados a uma issue.

## Antes de enviar uma mudança

- Mantenha as quatro ferramentas MCP somente leitura e a autenticação de todas as superfícies privadas.
- Preserve IDs, autoria, instante original, citações, revisões observadas e motivos de mídia indisponível. Nunca invente histórico ou campos ausentes.
- Trate texto, nomes e arquivos recebidos como dados não confiáveis. Não exponha envelopes brutos, chaves de mídia, sessão ou caminhos arbitrários.
- Confira replay/reconexão, interrupção de mídia, autenticação, fuso/paginação, exportação e restauração conforme o comportamento alterado.
- Execute os testes afetados e a suíte completa. Para mudar Docker, pins ou o verificador, confira também `docker build --tag zap-mcp:check .`.
- Descreva o problema, o comportamento resultante e a validação; sanitizar erros e exemplos faz parte da entrega.

`ops/dependency-pins.json` mantém nome, versão e SRI das dependências selecionadas. O verificador compara esses pins com o lock e consulta cada entrada do lock no registro oficial antes dos lifecycles do build Docker. Atualize pins e lock de forma coerente, após conferir a origem; não contorne incompatibilidades removendo verificações.

O projeto usa [licença MIT](LICENSE). A propriedade `private: true` do pacote impede publicação npm acidental e não controla a visibilidade do GitHub.
