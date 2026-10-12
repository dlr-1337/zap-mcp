## Deferred Items

- Login do site sob TLS nativo com Origin HTTPS foi recusado com403 na prova03-04; `createWebAuth.csrf` usa Origin http://Host. O oráculo web foi executado em HTTP loopback e o MCP permaneceu em HTTPS verificado. Revisar o canal/Origin/proxy do site na fase4 antes de declarar implantação pronta; configuração e comportamento de produção ainda não foram comprovados.
  status: open
