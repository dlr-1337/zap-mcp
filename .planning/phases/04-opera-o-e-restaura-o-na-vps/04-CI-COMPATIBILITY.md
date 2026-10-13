# CI e compatibilidade de age

O primeiro CI da publicação não tinha `/usr/bin/age-keygen`. O workflow agora instala o asset Linux amd64 oficial de age1.3.2, verificando SHA-256 antes de extrair/executar, com download HTTPS e prazo limitado. Nenhum pin npm, permissão de workflow ou credencial mudou.

O binário oficial imprime `v1.3.2`; o pacote Arch instalado imprime `1.3.2`. O gate aceita apenas essas duas representações da versão fixada. Asset e digest foram conferidos na [release oficial](https://github.com/FiloSottile/age/releases/tag/v1.3.2).

- RED: o binário oficial, com checksum conferido, falhou no gate anterior de createAgeCipher antes de cifrar a fixture.
- GREEN: os 11 testes offsite passaram com o binário oficial em container Node24.21.0 sem rede, incluindo cifragem, readback, restauração, interrupções e ACK.
- A suíte padrão com o pacote Arch passou257/257, zero fail/cancelled/skipped/todo,75,513s. Fonte e pins não mudaram depois desse resultado.
- YAML do workflow e sintaxe Bash da instalação conferidos; o CI remoto da revisão final ainda deve ser observado.

Dados, sessão, VPS, Codex e requisitos OPS continuam sem alteração/aceite operacional. A implantação real permanece no checkpoint04-05-02 aguardando confirmação da chave SSH temporária e provas atuais de configuração/backup.
