# Phase 3 — Aceite local do tracer MCP

Execução do plano03-01 em2026-10-12. Este recibo cobre a capacidade inicial de anexos; consultas/contexto e o veredito independente da fase permanecem nos planos seguintes. Identidades, nomes, conteúdo, tokens, caminhos privados e hashes reais ficam fora do Git.

## Cliente, canal e entrega real

- Codex instalado **0.162.1**, Node **24.21.0**, SDK oficial server **2.3.1** / node **2.1.1**, Zod **4.6.6**.
- HTTPS nativo em loopback, certificado SAN **localhost**, CA privada acrescentada somente ao ambiente do subprocesso. Nenhuma CA de sistema instalada; verificação TLS não foi desabilitada. A configuração Codex original foi comparada byte a byte ao finalizar; servidores e conta existentes foram preservados por overrides mesclados apenas na invocação.
- Controle negativo: sem CA privada, o Codex recusou o canal e o servidor observou alerta de certificado; nenhum initialize chegou. Controle positivo: mesma identidade localhost e cadeia confiada permitiram negociação e entrega.
- Negociação efetivamente observada: **initialize**, protocolo **2025-06-18**, cliente **codex-mcp-client**. SDK v2 não foi confundido com era de protocolo.
- Cópia restaurada privada offline da fase2, sem segundo coletor, novo QR ou escrita no WhatsApp. Os dois originais foram escolhidos por ID canônico, com fd/tamanho/SHA conferidos antes do teste.
- Codex invocou **get_attachment** duas vezes: original pequeno com preferência inline e maior com preferência download. Imagem pequena de **4.200bytes** recebida no content/image; original maior de **271.485bytes** servido pelo caminho de download.
- Para salvar os originais com bytes verificáveis, o processo Codex executou auxiliar privado que fez GET explícito autenticado no mesmo origin HTTPS, sem redirects. O auxiliar leu bearer de ambiente, sem token no modelo/argv/TOML/URL/log. Ambos os arquivos efetivamente gravados foram comparados com os originais independentes: **2/2 tamanhos e SHA-256 iguais**. URL/listagem não substituiu entrega.
- Teto defensivo inline exposto: **262.144bytes**, apenas imagens com assinatura reconhecida; formatos/tamanhos restantes usam download. A amostra real demonstra suporte ao pequeno observado, sem prometer suporte universal a formatos ou ao teto em todos os clientes.
- Tracer inicial e feedback gate passaram3/3; reteste após mudanças de consumo passou **11/11**, zero fail/skip/todo, **121,838s**. Recibos, transcrições e arquivos0600/diretórios0700 permanecem privados. Conferência privada adicional confirmou ausência do bearer nas duas transcrições finais.

## Proteção e isolamento

- Sem bearer, bearer incorreto, cookie web e sessão de protocolo: **401 antes do parsing**. Host externo e Origin estranho:403; Origin ausente do cliente nativo permitido explicitamente. GET/HEAD de original exige bearer independente.
- Schema fechado por ID/preferência; tool inventada, path/URL adicional e ID malformado recusados. tools/list contém somente get_attachment; nenhuma capacidade de socket/coletor foi dada ao adaptador.
- Rotação concorrente por outra conexão auth.sqlite não mistura digest antigo com geração nova. Rotação local por CLI opera sem startup de serviço/coletor e publica segredo em arquivo exclusivo0600, com fsync e atualização transacional. Credencial anterior continua recusada após reabrir o banco.
- Respostas inline já bufferizadas e próximos blocos de streams são bloqueados após rotação/restrição; duas transferências simultâneas interrompidas ficam parciais. Cancelamento/HEAD fecham recursos; originais permanecem intactos.
- Restrito, desconhecido, pendente/falho/indisponível, symlink e corrupção não são entrega concluída; erro/estado explícito e retry_wait para original divergente. Hash inline é conferido novamente depois da leitura.
- Logout web preserva a geração MCP; rotação MCP preserva senha, configuração web, lock e originais. Operações WhatsApp de envio/edição/exclusão/leitura/presença continuam ausentes.

## Dependências e regressão

Registry e repos oficiais, engines/peer, integridades, scripts e transitivas novos foram conferidos antes/depois da instalação. Pins exatos mantidos; dependências novas transitivas core2.3.1, hono4.13.13 e @hono/node-server1.19.17 têm origem oficial e nenhum lifecycle de instalação no lock. Não foram adicionados SDK client/express, bridge ou IdP.

Suíte final **154/154**, zero fail/cancel/skip/todo, **91,255s**, por `TMPDIR` privado na partição/home + `mise exec node@24.21.0 -- npm test`. Logs locais ignorados em dist. A primeira tentativa em/tmp teve SQLITE_IOERR_WRITE sob temporários concorrentes; a repetição na partição/home eliminou esses erros. Uma expectativa histórica de/mcp=404 também existia em export.test.ts; passou a401, mantendo todas recusas de operações WhatsApp404.

**Limite:** prova de compatibilidade/entrega local no Codex instalado. Não demonstra operação na VPS, histórico integral ou conclusão de toda a fase3. A implantação/proxy/supervisão e o aceite operacional final pertencem à fase4.

## Diagnóstico e reteste pós-wave

O pós-wave em TMPDIR/home encontrou153/154 com ECONNRESET no caso HTTP de janelas/auth. Quatro focos passaram, mas a suíte completa reproduziu o mesmo reset. Instrumentação temporária e pausa determinística7.500ms localizaram o erro no primeiro GET de paginação após260 escritas síncronas, enquanto ambos os sockets idle expiravam ao retomar o event loop. A hipótese de bodies não consumidos foi rejeitada e seu ajuste descartado.

Correção de fixture `c772a24`:uma volta de setImmediate depois do seed, antes do próximo HTTP, permitindo processar timers/I/O atrasados. Sem retry, mudança de timeout, produto ou assertivas; instrumentação não permanece no código. Mesmo repro controlado passou duas vezes após a correção, inclusive sem instrumentação. Suíte final no runtime/TMPDIR originais: **154/154, zero fail/cancel/skip/todo,102,974s**, com caso natural corrigido12,23s. Logs sintéticos preservados privadamente. Transporte MCP, arquivos reais, configuração do Codex, coletor original e tracking não foram alterados neste follow-up.
