# Revalidação corretiva da cadeia MCP — fase 03

A auditoria independente encontrou um desvio de ordem em 03-01: os metadados de server/node/zod/core foram consultados às13:50:06/24Z de2026-10-12, a instalação ocorreu às13:51:01Z e partes das transitivas/lock só foram auditadas às13:52:25Z,13:53:18Z e13:56:08Z. O registro histórico permanece; esta correção não afirma que a verificação preventiva original ocorreu.

Em2026-10-12 foi executada uma revalidação atual com instalação isolada dos mesmos seis pacotes/pins, com scripts desabilitados, seguida de comparação integral dos arquivos publicados com os instalados no projeto. A cópia isolada foi criada fora do checkout, em diretório privado. Não houve modificação de node_modules do projeto, package.json/lock, coletor, sessão ou dados originais.

## Evidência executada

- Grafo completo das seis entradas adicionadas/alteradas frente ao baseline96610dbf foi identificado pelo lock; todas suas dependencies resolvem dentro dessas seis entradas.
- `npm view <nome>@<pin> --json` confirmou nome/versão, repositórios oficiais, tarball registry.npmjs.org e SRI iguais ao lock.
- Os seis tarballs foram baixados por HTTPS no origin fixo sem redirects, verificados por SHA512/SRI e inspecionados sem executar conteúdo. Manifestos/dependencies coincidem com o lock; nenhum preinstall/install/postinstall/prepare; arquivos absolutos/traversal/symlink/hardlink são recusados.
- Todas as verificações acima terminaram em `2026-10-12T17:49:29.097685+00:00`, antes do começo de `npm ci --ignore-scripts --no-fund --no-audit` em `2026-10-12T17:49:29.097909+00:00`. Instalação isolada exit0.
- Foram comparados1586arquivos: bytes de cada membro regular do tarball são iguais tanto ao stage quanto aos pacotes usados pelo projeto. Isso comprova a integridade atual, inclusive transitivas, sem apagar o desvio histórico.
- `npm audit --omit=dev --json` no grafo MCP isolado: exit0, zero info/low/moderate/high/critical. Não é alegação sobre todo o grafo legado do projeto.
- Import/instanciação de McpServer, NodeStreamableHTTPServerTransport e parsing Zod no stage, Node24.21.0: exit0. Verificações concluídas em `2026-10-12T17:49:30.657067+00:00`.

| Pacote | Pin | Arquivos comparados | Lifecycle de instalação |
|---|---|---|---|
| @hono/node-server | 1.19.17 | 55 | nenhum |
| @modelcontextprotocol/core | 2.3.1 | 21 | nenhum |
| @modelcontextprotocol/node | 2.1.1 | 11 | nenhum |
| @modelcontextprotocol/server | 2.3.1 | 85 | nenhum |
| hono | 4.13.13 | 574 | nenhum |
| zod | 4.6.6 | 840 | nenhum |

Resultado estruturado sanitizado: [03-DEPENDENCY-REVALIDATION.json](03-DEPENDENCY-REVALIDATION.json). Metadados/tarballs/logs e o verificador assert-based ficam no diretório privado de orquestração; todas as assertions passaram. T-03-SC continua aguardando reauditoria independente desta mitigação. Não foi aceito risco automaticamente nem declarado o passado conforme.
