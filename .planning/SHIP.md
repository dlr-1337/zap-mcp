# Publicação da fase 1

A entrega publica uma réplica sanitizada do histórico e do estado final verificado da fase1, a partir de origin/main. O histórico local completo de95 commits e o coletor ativo permanecem no checkout original. A revisão de conteúdo encontrou somente nome de conversa em documentos/histórico; nenhuma credencial, identificador de mensagem/contato, hash real de mídia ou arquivo de conta foi incluído na publicação. O nome foi substituído por uma indicação genérica.

Janelas antigas de commits nos SUMMARYs foram preservadas sob implementation_history com escopo local privado. A réplica preserva a sequência real de testes/implementações; hashes afetados pela sanitização podem diferir dos originais. Os campos históricos locais não são promessas de IDs idênticos na publicação.

Verificação funcional anterior:88/88 condições,15 requisitos da fase1 e UAT28/28(17 automatizados,11 observações do agente). Testes sintetizados não afirmam histórico integral; bytes diretamente baixados do Web e estabilidade prolongada do Chrome permanecem limites. VPS/MCP pertencem às fases seguintes. CI valida fontes/pins/testes sintéticos em Node24.21.0, sem conta, sessão ou dados reais.

## Verificação do snapshot publicado

Na instalação isolada,85/86 testes passaram inicialmente; o teste HTTP revelou500 para a UI quando o código estava sob diretório oculto. Causa: caminho absoluto em sendFile incluía .codex, interpretado pelo pacote send como dotfile; middleware sanitizado devolvia500.

Regressão independente usa uma cópia dos módulos sob .checkout, dados sintéticos fora do checkout e chamadas HTTP reais: três arquivos públicos devem responder200/no-store, arquivos privados404 e acervo sem sessão401. RED8790602 demonstrou500!=200. GREENfcdd6a7 usa somente filename allowlisted com root:publicDir; não habilita dotfiles nem amplia rotas. Suíte completa do snapshot87/87, zero failures/skips em12,63s. Fix e regressão foram integrados ao checkout original, preservando o coletor existente.

CI mínima: Ubuntu, Node24.21.0, actions oficiais fixadas por SHA, token contents:read e credenciais de checkout não persistidas. npm ci, sintaxe de public/app.js e npm test; sem conta real ou segredos de runtime no runner.

A exportação inicial por snapshot isolado fazia o gate TDD perder os commits originais. A publicação passou a preservar a sequência histórica real por uma réplica sanitizada; nenhum commit RED/GREEN fictício ou relaxamento de TDD foi usado. Os commits originais permanecem privados no checkout de implementação.
