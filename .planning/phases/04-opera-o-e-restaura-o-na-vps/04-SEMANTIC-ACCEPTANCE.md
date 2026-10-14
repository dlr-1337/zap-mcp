---
phase: "04"
criterion: SC4 / OPS-04
status: failed
semantic_acceptance: false
human_confirmation_claimed: false
full_operational_acceptance_repeated: false
---

# Conferência semântica adicional

**A distinção semântica não passou de forma consistente nos dois clientes.** O caso real foi consultado no permanente e em um único clone offline adicional, pelo mesmo HTTPS, sem repetir atualização, offsite ou o aceite dos26 gates. O recibo operacional aprovado foi preservado.

| Evidência | Permanente | Restaurado |
|---|---|---|
| Codex CLI instalado | 0.162.1;8 chamadas atuais | 0.162.1;8 chamadas atuais |
| Originais salvos e conferidos | 2 | 2 |
| Referências realmente recebidas em busca/contexto | 12 | 12 |
| Proposta/orçamento | Encontrado | Encontrado |
| Confirmação explícita | Afirmada com referências | Declarada não encontrada no recorte |
| Chrome | 142 mensagens visíveis; comparação SQL/texto aprovada | 142 mensagens visíveis; contexto guardado privadamente durante o clone |

Os conjuntos recebidos e as janelas de contexto são **idênticos**. As duas referências de confirmação citadas pelo permanente também foram recebidas pelo restaurado. Assim, a divergência não pode ser explicada por falta de cobertura: a resposta restaurada precisa falhar a conferência semântica, em vez de ser aprovada apenas por declarar limites.

## Método e falhas preservadas

O prompt pediu explicitamente separar proposta/orçamento de aceitação da proposta, citar referências estáveis/trechos e limitar ausência ao material efetivamente consultado. Anexo, orçamento, pedido de orçamento ou um “sim” sem contexto não estabelecem fechamento.

O programa abriu SQLite readonly da restauração atual, comparou referências/trechos literalmente e submeteu as linhas SQL a uma avaliação semântica independente, sem MCP. O permanente passou essa avaliação e a conferência do Chrome. O primeiro dataset do avaliador omitiu três referências recebidas na busca; essa falha foi registrada e corrigida para incluir o conjunto efetivamente recebido, sem repetir o cliente permanente.

A resposta restaurada foi emitida dentro do budget e citou contexto para sustentar seu `not_found`. Um schema privado inicialmente exigia evidências vazias para ausência e a rejeitou; essa exigência excessiva foi corrigida somente na análise offline da resposta já emitida. A correção não aprovou a falsa ausência: a comparação exata de cobertura e a reavaliação continuaram sem aceite semântico. As respostas e as falhas originais foram preservadas.

Não houve marker semântico aprovado antes de DONE, e nenhum foi fabricado depois do cleanup. Esta execução adicional é parcial e não cria nem substitui os26 gates do recibo original. Avaliação LLM não representa confirmação humana ou julgamento autoritativo global.

## Cleanup e continuação

O finally enviou DONE e o helper removeu o clone, restaurou G único offline e preservou o perfil, com prontidão HTTPS autenticada. A conferência final confirmou token temporário recusado com401, envelope removido, origem original fenced/quieta, configuração permanente preservada e timer exatamente active/enabled. O site ficou na tela de login, sem acervo visível.

Foi recuperado privadamente o ID exato da sessão restaurada para possível follow-up. Entretanto, a invocação usou `--ephemeral`; a ajuda local documenta ausência de persistência, e nenhum arquivo dessa sessão foi encontrado nas sessões gravadas ou arquivadas. Não foi usado `--last`, não houve injeção de texto/fatos novos e não foi recriado cliente ou clone.

**SC4/OPS-04 permanece sem aceite semântico.** O orquestrador recebe o transcript original, respostas, linhas SQL, comparação dos dois conjuntos, avaliação e cleanup privados para decidir a próxima abordagem. VERIFICATION, REQUIREMENTS, STATE e ROADMAP não foram alterados por este complemento. As três proibições advisory continuam separadas deste resultado.

Conteúdo, nomes, IDs, referências, caminhos privados e hashes ficam exclusivamente na evidência0600 fora do Git. Este documento publica apenas método, critérios, resultados, contagens e limites.
