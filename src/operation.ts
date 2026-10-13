import type { Server } from 'node:http';

const shutdowns = new WeakMap<Server, Promise<void>>();
export function shutdownService({ server, close, controller = new AbortController(), timeoutMs = 30_000 }: { server: Server; close(): void | Promise<void>; controller?: AbortController; timeoutMs?: number }) {
  const existing = shutdowns.get(server); if (existing) return existing;
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1000 || timeoutMs > 120_000) throw Error('Prazo de shutdown inválido');
  const work = (async () => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const deadline = new Promise<never>((_, reject) => { timer = setTimeout(() => { controller.abort(); server.closeAllConnections(); reject(Error('Shutdown excedeu prazo; recovery obrigatório')); }, timeoutMs); });
    const http = new Promise<void>((resolve, reject) => server.close(error => error && (error as NodeJS.ErrnoException).code !== 'ERR_SERVER_NOT_RUNNING' ? reject(error) : resolve()));
    controller.abort(); server.closeAllConnections();
    try { await Promise.race([Promise.all([Promise.resolve().then(close), http]), deadline]); }
    finally { clearTimeout(timer); }
  })();
  shutdowns.set(server, work); return work;
}
