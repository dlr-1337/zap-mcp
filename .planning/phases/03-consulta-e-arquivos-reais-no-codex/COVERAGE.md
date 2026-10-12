# API Coverage — MCP oficial sobre arquivo privado

Superfície de integração delimitada pelo requisito MCP-01 a MCP-05 e D-17: consultas locais somente leitura. O SDK implementa a negociação/protocolo; suas capacidades adicionais não ampliam o produto autorizado.

| capability | decision | reason |
|---|---|---|
| descoberta/negociação de protocolo e initialize legado quando negociado | INTEGRATE | Cliente real e handler oficial, 03-01 |
| Streamable HTTP, metadados/erros/lifecycle necessários ao cliente | INTEGRATE | Transporte oficial autenticado por requisição, 03-01 |
| tools/list e tools/call | INTEGRATE | Allowlist fechada das quatro consultas, 03-01/02/03 |
| find_conversations | INTEGRATE | Candidatos canônicos, 03-02 |
| search_messages | INTEGRATE | Filtros/snapshots/continuação, 03-02 |
| get_context | INTEGRATE | Proveniência e vizinhas, 03-03 |
| get_attachment e GET autenticado do original | INTEGRATE | Bytes/hash no destino, pequeno/grande, 03-01 |
| content/structuredContent e binário suportado na resposta | INTEGRATE | Medir Codex real; formato/limite sem suporte usa download explícito, 03-01/04 |
| resources/list/read/templates como API adicional | OPT-OUT | D-17 escolhe ferramentas de consulta; resource embutido só se a prova real exigir, sem nova superfície de listagem |
| prompts/list/get | OPT-OUT | Conversa arquivada é dado, não prompt privilegiado; D-12/D-17 |
| subscriptions/notifications/SSE persistente | OPT-OUT | Consultas explícitas com snapshots; sem requisito de assinatura, protocolo moderno não exige SSE persistente |
| sampling/elicitation/roots e chamadas ao cliente | OPT-OUT | Não há agente/chatbot hospedado, filesystem arbitrário ou entrada adicional no escopo |
| OAuth/IdP/discovery auth adicional | OPT-OUT | Bearer privado já escolhido; autenticação adicional foi adiada explicitamente |
| sessão de protocolo como autoridade | OPT-OUT | D-02 exige bearer vigente em cada requisição; ID de sessão não concede acesso |
| exportação MCP | OPT-OUT | Exportação é capacidade do site da fase2; nenhum requisito novo MCP |
| envio/edição/exclusão/read receipts WhatsApp | OPT-OUT | Bloqueio efetivo obrigatório em MCP-05/D-17, sem socket no adapter |
| cliente Claude/bridge/segundo coletor | OPT-OUT | Explicitamente fora da fase e das decisões atuais |

Cobertura é decisão de planejamento; nenhuma linha comprova implementação ou aceite real. Limites/protocolo/formato usados de fato devem vir do Codex instalado e do recibo atual.
