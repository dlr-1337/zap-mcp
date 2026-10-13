import { isIP } from 'node:net';
import type { Request, RequestHandler } from 'express';

export type TransportConfig = { mode: 'local' } | { mode: 'proxy'; publicOrigin: string; trustedProxyPeers: readonly string[] };
const loopback = new Set(['127.0.0.1', '::1']);
const peer = (address: string) => address.startsWith('::ffff:') && isIP(address.slice(7)) === 4 ? address.slice(7) : address;

export function createTransport(config: TransportConfig = { mode: 'local' }) {
  let publicOrigin: string | undefined;
  const peers = new Set<string>();
  if (config.mode === 'proxy') {
    const url = new URL(config.publicOrigin);
    if (url.protocol !== 'https:' || url.username || url.password || config.publicOrigin !== url.origin || !url.hostname) throw Error('Origem HTTPS canônica inválida');
    publicOrigin = url.origin;
    if (!Array.isArray(config.trustedProxyPeers) || !config.trustedProxyPeers.length) throw Error('Peers do proxy obrigatórios');
    for (const address of config.trustedProxyPeers) {
      if (typeof address !== 'string' || !isIP(address) || address.includes('%')) throw Error('Peer do proxy inválido');
      const normalized = peer(address); if (peers.has(normalized)) throw Error('Peer do proxy duplicado'); peers.add(normalized);
    }
  } else if (config.mode !== 'local') throw Error('Modo de transporte inválido');
  const trustProxy = (address: string, hop: number) => config.mode === 'proxy' && hop === 0 && peers.has(peer(address));
  const canonicalOrigin = (req: Request) => publicOrigin ?? `${(req.socket as { encrypted?: boolean }).encrypted ? 'https' : 'http'}://${req.get('Host')}`;
  const secure = config.mode === 'proxy' ? true : 'auto' as const;
  const guard: RequestHandler = (req, res, next) => {
    const counts = new Map<string, number>();
    for (let i = 0; i < req.rawHeaders.length; i += 2) { const name = req.rawHeaders[i].toLowerCase(); counts.set(name, (counts.get(name) ?? 0) + 1); }
    const ambiguous = ['host', 'origin', 'authorization', 'cookie', 'x-forwarded-proto'].some(name => (counts.get(name) ?? 0) > 1);
    const forwarded = [...counts.keys()].some(name => name === 'forwarded' || name.startsWith('x-forwarded-') && !(config.mode === 'proxy' && name === 'x-forwarded-proto'));
    const address = peer(req.socket.remoteAddress ?? ''), host = req.get('Host') ?? '';
    const valid = config.mode === 'proxy'
      ? peers.has(address) && host === new URL(publicOrigin!).host && req.get('X-Forwarded-Proto') === 'https'
      : loopback.has(address) && /^(127\.0\.0\.1|localhost)(:[0-9]+)?$/.test(host);
    if (ambiguous || forwarded || !valid || req.get('Origin') !== undefined && req.get('Origin') !== canonicalOrigin(req)) { res.status(403).json({ error: 'Transporte recusado' }); return; }
    next();
  };
  return { guard, trustProxy, canonicalOrigin, secure };
}

export function transportFromEnv(env: NodeJS.ProcessEnv): TransportConfig {
  if (env.ZAP_PUBLIC_ORIGIN === undefined && env.ZAP_TRUSTED_PROXY_PEERS === undefined) return { mode: 'local' };
  const config: TransportConfig = { mode: 'proxy', publicOrigin: env.ZAP_PUBLIC_ORIGIN ?? '', trustedProxyPeers: (env.ZAP_TRUSTED_PROXY_PEERS ?? '').split(',') };
  createTransport(config); return config;
}
