# Fase 1: Arquivo privado com mensagens e mídias reais — Pattern Map

**Mapeado:** 2026-10-10  
**Unidades classificadas:** 28 (inclui `public/` como uma unidade; seus nomes finais ficam para o plano)  
**Análogos de código encontrados:** 0 / 26 unidades novas  
**Convenções existentes reutilizáveis:** `.gitignore` e `README.md`.

## File Classification

Todos os nomes de produto abaixo são propostas da pesquisa, não arquivos existentes. Não há imports, helpers, componentes, rotas ou dependências instaladas a copiar. A lista explicita arquivos citados e configurações implicadas pela Wave 0; não obriga criar camadas adicionais.

| Arquivo novo/modificado | Papel | Fluxo | Análogo mais próximo | Qualidade |
|---|---|---|---|---|
| `src/main.ts` | config / service | event-driven, file-I/O | Nenhum | greenfield |
| `src/whatsapp/auth.ts` | store | CRUD | Nenhum | greenfield |
| `src/whatsapp/collector.ts` | service | event-driven | Nenhum | greenfield |
| `src/archive/schema.sql` | migration / model | CRUD | Nenhum | greenfield |
| `src/archive/ingest.ts` | service | event-driven, transform | Nenhum | greenfield |
| `src/archive/query.ts` | service | request-response | Nenhum | greenfield |
| `src/media/worker.ts` | service | streaming, file-I/O | Nenhum | greenfield |
| `src/http/auth.ts` | middleware / store | request-response, CRUD | Nenhum | greenfield |
| `src/http/app.ts` | route / controller | request-response | Nenhum | greenfield |
| `public/` (ativos próprios, nomes a definir) | component | request-response | Nenhum | greenfield |
| `scripts/backup.ts` | utility | batch, file-I/O | Nenhum | greenfield |
| `package.json` | config | batch | Nenhum | greenfield |
| `package-lock.json` | config | batch | Nenhum | gerado pela instalação conferida |
| `tsconfig.json` | config | transform | Nenhum | greenfield |
| `.env.example` | config | file-I/O | `.gitignore:9-12` | convenção documental |
| `test/auth.test.ts` | test | request-response | Nenhum | greenfield |
| `test/http.test.ts` | test | request-response | Nenhum | greenfield |
| `test/security.test.ts` | test | request-response, transform | Nenhum | greenfield |
| `test/collector.test.ts` | test | event-driven | Nenhum | greenfield |
| `test/readonly.test.ts` | test | event-driven | Nenhum | greenfield |
| `test/auth-state.test.ts` | test | CRUD, file-I/O | Nenhum | greenfield |
| `test/archive.test.ts` | test | event-driven, transform | Nenhum | greenfield |
| `test/revisions.test.ts` | test | event-driven | Nenhum | greenfield |
| `test/coverage.test.ts` | test | event-driven | Nenhum | greenfield |
| `test/media.test.ts` | test | streaming, file-I/O | Nenhum | greenfield |
| `test/recovery.test.ts` | test | streaming, file-I/O | Nenhum | greenfield |
| `.gitignore` (somente se faltarem exclusões concretas) | config | file-I/O | Próprio arquivo | existente |
| `README.md` (documentar o resultado real) | config / documentação | batch | Próprio arquivo | existente |

## Pattern Assignments

Sem análogos de fonte locais. As referências abaixo apontam para **recomendações**, não implementação comprovada. O planejador deve citar as seções de `01-RESEARCH.md` e prever verificação dos contratos; não afirmar que há padrão estabelecido de imports, autenticação, erros ou testes.

### Inicialização e configuração

**Aplica a:** `src/main.ts`, `package.json`, `package-lock.json`, `tsconfig.json`, `.env.example`.

**Referência:** pesquisa, “Recommended Project Structure / Component Responsibilities” (240–255), “Standard Stack” e “Wave 0 Gaps”. Validar configuração e diretório privado, abrir bancos, reconciliar antes de operar e habilitar coletor explicitamente. Build ESM/NodeNext e `node:test` são propostos; nenhum script npm existe ainda. Lockfile deve vir da instalação verificada, sem inventar resolução de pacotes. Exemplo de ambiente só contém nomes e valores fictícios; armazenamento real fica fora do checkout.

### Sessão WhatsApp e coletor

**Aplica a:** `src/whatsapp/auth.ts`, `src/whatsapp/collector.ts`.

**Referência:** pesquisa, Patterns 1 e 3 (257–280; 298–310), exemplos do socket e KeyStore (382–418). Persistir categorias e credenciais com commit real, roundtrip de buffers/proto, remoção `null` e propagação de falhas. Um escritor, trava antes do socket, eventos drenados, QR efêmero privado e reconexão limitada. HTTP não recebe socket ou auth. Exemplos pesquisados não são worker/store completos nem código compilado; conferir a API do pin instalado antes de implementar.

### Arquivo, proveniência e consulta

**Aplica a:** `src/archive/schema.sql`, `src/archive/ingest.ts`, `src/archive/query.ts`.

**Referência:** pesquisa, Pattern 2 (282–296), schema mínimo e Pattern 3. Mensagem, revisão e job entram na mesma transação; preservar chaves de origem, instantes, PN/LID e referências estáveis. Não unir homônimos ou ressuscitar revogação por replay. Registro de cobertura descreve recebido/confirmado/falhas, sem promessa integral. Consulta parametrizada e DTO de campos permitidos somente sobre arquivo local; envelopes e sessão não saem para HTTP. Falha SQL não confirma ingestão. Não há migration runner, repository ou DTO existente a reutilizar.

### Mídia recuperável

**Aplica a:** `src/media/worker.ts`.

**Referência:** pesquisa, Pattern 4 (312–322), exemplo “Streaming sem declarar sucesso cedo” (420–439). Classificar restrições antes de normalizar; não baixar visualização única ou thumbnail como original. Reserva transacional de job, stream com limites, temporário exclusivo, verificação de bytes/hash, finalização e depois disponibilidade no banco. Falhas preservam mensagem e gravam motivo seguro. Reinício reconcilia lease/temporário/final; consulta não inicia download remoto. Sem classe genérica de jobs ou abstração de armazenamento preventiva.

### HTTP e leitura básica

**Aplica a:** `src/http/auth.ts`, `src/http/app.ts`, `public/`.

**Referência:** pesquisa, Pattern 5 (324–332); contexto D-01–D-04 e D-17–D-18. Sessão SQLite revogável, scrypt e comparação segura, regenerate/destroy, limitação de tentativas e origem/CSRF. Autenticação uniforme em QR/status/conversas/downloads, inclusive acesso por ID, HEAD e Range. Erro sanitizado, validação de cursor/limite/ID, `no-store`, CSP e conteúdo renderizado por `textContent`. Downloads ativos não executam na origem do site. Preservar funcionamento offline. `public/` contém somente ativos próprios; conferir o contrato visual da fase antes de fixar nomes. Não criar framework frontend, busca/abas/ZIP ou MCP.

### Cópia e restauração anterior ao piloto

**Aplica a:** `scripts/backup.ts`, inicialização e testes de recuperação.

**Referência:** pesquisa, Pattern 6 (334–338). Pausar/drenar, fechar os dois bancos e copiar acervo/auth/mídia/manifesto de modo coordenado; não copiar apenas `.db` em WAL ativo. Restore isolado com coletor desabilitado, integridade SQL/FK e binários conferidos. Gate anterior ao QR é parte desta fase; operação recorrente externa fica na fase 4. Não há script operacional local existente a copiar.

### Testes

**Aplica a:** todos os onze `test/*.test.ts` classificados.

**Referência:** pesquisa, “Validation Architecture” (490–544). `node:test` proposto, fixtures sintéticas e diretórios temporários privados. HTTP via fetch local e coletor fake; testes de replay/revisão/categorias de chave, autorização direta, restrições de mídia e falhas reais do stream. Crash em subprocessos nos pontos críticos e ENOSPC por injeção controlada. Fixtures/helpers só surgem se necessários aos testes, sem catálogo genérico. Build e testes sintéticos não substituem pareamento, comparação com celular ou quatro originais reais.

## Shared Patterns

### Exclusão de dados e artefatos — convenção existente

**Fonte rastreada:** `.gitignore`, linhas 9–24. **Aplicar a:** configuração, bancos, auth, mídia, backups e evidências privadas.

```gitignore
.env
.env.*
!.env.example

# Acervo WhatsApp, sessões e exportações ficam fora do repositório público.
/data/
/storage/
/auth/
/sessions/
/media/
/exports/
/backups/
*.sqlite*
*.db
*.db-*
```

Linhas 4–7 também ignoram dependências, `dist/` e logs. Exclusão Git não autentica conteúdo nem substitui permissões privadas e diretório externo ao checkout. Conferir novos artefatos antes de publicar.

### Documentação e evidência — convenção existente

**Fonte rastreada:** `README.md`, linhas 5–7, 15 e 26–30. **Aplicar a:** atualização do README e evidências finais de planejamento.

```markdown
Projeto em planejamento. Este repositório contém a definição do produto, a pesquisa técnica, 32 requisitos e um roadmap de quatro fases. A aplicação ainda não está implementada; não há instruções de instalação de um produto funcional.
```

Manter a distinção entre planejado, testado localmente e piloto observado; reescrever status apenas com evidência. `AGENTS.md` e documentos `.planning/` estabelecem privacidade, somente leitura e fronteiras das fases; são fontes de convenção, não análogos de código.

### Padrões transversais ainda a implementar

- Autorização: gate comum em todas as rotas privadas; sessão do site separada de auth WhatsApp.
- Erros/logs: saída sanitizada; QR/chaves/envelopes/conteúdo real não vão para logs ou evidência pública. Nenhum logger/wrapper próprio existe.
- Durabilidade: commit antes de confirmar, worker reconciliável, cópia coerente e restauração sem segundo coletor.
- Validação: IDs/cursors/limites, dados hostis renderizados como texto, caminhos gerados internamente, verificação de integridade binária.
- Identidade/tempo: autoria e campos desconhecidos explícitos, PN/LID com proveniência, instante original preservado e exibição em America/Sao_Paulo.

## No Analog Found

Todas as 26 unidades novas da classificação carecem de análogo de código. Usar pesquisa e contratos verificados da Wave 0 como base. Nenhum trecho externo foi apresentado como fonte local; não existe razão para criar arquitetura adicional apenas para preencher este mapa.

## Metadata

**Escopo da busca:** inventário Git do repositório, arquivos de contexto/pesquisa, `.gitignore`, `README.md` e presença de `.codex/skills/` / `.agents/skills/` (nenhum catálogo local encontrado).  
**Fontes de produto rastreadas:** 0; inventário contém planejamento e documentação. `.gitignore`, `README.md`, `AGENTS.md` e contexto/pesquisa foram confirmados por `git ls-files`. Nenhum mirror de runtime foi usado.  
**Limites:** sem instalação, implementação, build, testes de produto, VPS ou conta real; nenhuma evidência de aceite criada por este mapa.  
**Data de extração:** 2026-10-10.
