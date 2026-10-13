import test from 'node:test';
import assert from 'node:assert/strict';

const helperPath = '../../ops/zap-container-control.mjs';
const { control } = await import(helperPath);
const unit = 'zap-mcp-runtime.service';
const profileHash = '21d56527d0808f137ef46ad2bae84e408622e27f13d310c9d78914e092831eb6';

function fixture() {
  const config = { uid: 12001, machineId: 'a'.repeat(32), dataDir: '/srv/private/profile-b', appLabel: 'fixture', releases: ['b'.repeat(40), 'd'.repeat(40)], bootUnit: unit };
  const containers = config.releases.flatMap((release, i) => ['offline', 'collect'].map((mode, j) => ({
    Id: String(i * 2 + j + 1).repeat(64), Config: { User: '12001:12001', Cmd: ['node', 'dist/src/main.js', 'serve', ...(mode === 'collect' ? ['--collect'] : [])], Env: ['ZAP_DATA_DIR=' + config.dataDir], Labels: { 'zap.archive': config.appLabel, 'zap.release': release } },
    HostConfig: { PidMode: 'host', Privileged: false, RestartPolicy: { Name: 'no', MaximumRetryCount: 0 }, PortBindings: {} }, Mounts: [{ Type: 'bind', Source: config.dataDir, Destination: config.dataDir, RW: true }], State: { Running: false, Status: 'exited', Pid: 0, StartedAt: 'fixture' }
  })));
  let enabled = false, state: any = null;
  const boot = { activeState: 'inactive', mainPID: 0, job: '' };
  const effects: string[] = [];
  const runner = async (file: string, args: string[]) => {
    if (file === '/usr/bin/systemctl') {
      if (args[0] === 'show') {
        if (args[1] === '--property=UnitFileState') { assert.deepEqual(args, ['show', '--property=UnitFileState', '--value', unit]); return { stdout: enabled ? 'enabled\n' : 'disabled\n' }; }
        assert.deepEqual(args, ['show', '--property=UnitFileState,ActiveState,MainPID,Job', '--', unit]);
        return { stdout: `UnitFileState=${enabled ? 'enabled' : 'disabled'}\nActiveState=${boot.activeState}\nMainPID=${boot.mainPID}\nJob=${boot.job}\n` };
      }
      assert.deepEqual(args, [args[0], '--', unit]); assert.ok(['enable', 'disable'].includes(args[0]));
      enabled = args[0] === 'enable'; effects.push(args[0]); return { stdout: '' };
    }
    assert.equal(file, '/usr/bin/docker');
    if (args[0] === 'ps') return { stdout: containers.map(c => c.Id).join('\n') };
    if (args[0] === 'inspect') return { stdout: JSON.stringify(containers) };
    const c = containers.find(c => c.Id === args.at(-1)); assert.ok(c);
    if (args[0] === 'start') { assert.deepEqual(args, ['start', c.Id]); c.State.Running = true; c.State.Status = 'running'; c.State.Pid = 412; }
    else if (args[0] === 'stop') { assert.deepEqual(args, ['stop', '--time', '60', c.Id]); c.State.Running = false; c.State.Status = 'exited'; c.State.Pid = 0; }
    else { assert.equal(args[0], 'update'); assert.ok(['--restart=no', '--restart=on-failure:3'].includes(args[1])); c.HostConfig.RestartPolicy.Name = args[1] === '--restart=no' ? 'no' : 'on-failure'; c.HostConfig.RestartPolicy.MaximumRetryCount = args[1] === '--restart=no' ? 0 : 3; }
    effects.push(args[0]); return { stdout: '' };
  };
  const bootState = { read: () => structuredClone(state), write: (value: any) => { state = structuredClone(value); effects.push('persist'); } };
  const opts = { runner, bootState };
  return { config, containers, effects, opts, bootState, boot, get state() { return state; }, set state(value: any) { state = value; }, get enabled() { return enabled; }, set enabled(value: boolean) { enabled = value; } };
}

test('boot enabled participa de autostart mesmo com todas políticas Docker desligadas', async () => {
  const f = fixture(); f.enabled = true;
  assert.equal((await control(f.config, 'inspect-runtime', undefined, undefined, f.opts)).autostart, true);
  assert.equal((await control(f.config, 'inspect', undefined, undefined, f.opts)).autostart, true);
  assert.deepEqual(f.effects, []);
});

test('stop desabilita primeiro só a unidade própria e confirma silêncio sem perder estado de boot', async () => {
  const f = fixture(); f.enabled = true; f.state = { retained: true }; f.containers[1].State = { Running: true, Status: 'running', Pid: 412, StartedAt: 'fixture' };
  f.containers[1].HostConfig.RestartPolicy.Name = 'on-failure';
  const facts = await control(f.config, 'stop', undefined, undefined, f.opts);
  assert.equal(f.effects[0], 'disable'); assert.equal(f.enabled, false); assert.equal(facts.autostart, false); assert.equal(facts.profileProcesses, 0); assert.equal(facts.running, false); assert.deepEqual(f.state, { retained: true });
});

for (const [index, mode] of [[0, 'offline'], [3, 'collect']] as const) test('start registra e habilita retomada observada ' + mode, async () => {
  const f = fixture(), selected = f.containers[index], release = selected.Config.Labels['zap.release'];
  const facts = await control(f.config, 'start', release, mode, f.opts);
  assert.equal(facts.running, true); assert.equal(facts.autostart, true); assert.equal(facts.release, release); assert.equal(facts.mode, mode);
  assert.deepEqual(f.state, { version: 1, machineId: 'a'.repeat(32), profilePathHash: profileHash, release, mode });
  assert.equal(f.enabled, true); assert.deepEqual(f.effects, ['start', 'update', 'persist', 'enable']); assert.equal(selected.HostConfig.RestartPolicy.MaximumRetryCount, 3);
  // A daemon restart loses the running process, but keeps Docker's configured retry policy.
  selected.State.Running = false; selected.State.Status = 'exited'; selected.State.Pid = 0; f.effects.length = 0;
  const rebooted = await control(f.config, 'start-boot', undefined, undefined, f.opts);
  assert.equal(rebooted.release, release); assert.equal(rebooted.mode, mode); assert.equal(rebooted.running, true); assert.equal(rebooted.autostart, true); assert.equal(f.enabled, true);
  assert.equal(f.containers.filter(c => c.State.Running).length, 1); assert.equal(f.effects[0], 'disable'); assert.deepEqual(f.effects.slice(-4), ['start', 'update', 'persist', 'enable']);
});

test('start comum recusa unidade habilitada até stop explícito', async () => {
  const f = fixture(); f.enabled = true;
  await assert.rejects(control(f.config, 'start', f.config.releases[0], 'offline', f.opts)); assert.deepEqual(f.effects, []);
});

test('start-boot recusa estado sem vínculo ou fora dos releases e modos permitidos antes de qualquer mutação', async () => {
  for (const value of [null, {},
    ...[{ machineId: 'e'.repeat(32) }, { profilePathHash: 'f'.repeat(64) }, { release: 'e'.repeat(40) }, { mode: 'send' }, { version: 2 }].map(change => ({ version: 1, machineId: 'a'.repeat(32), profilePathHash: profileHash, release: 'b'.repeat(40), mode: 'offline', ...change }))]) {
    const f = fixture(); f.state = value; f.enabled = true;
    await assert.rejects(control(f.config, 'start-boot', undefined, undefined, f.opts)); assert.deepEqual(f.effects, []); assert.equal(f.enabled, true);
  }
});

test('configuração de outra unidade nunca autoriza controle de systemd nem Docker', async () => {
  for (const bootUnit of ['docker.service', '../zap-mcp-runtime.service', 'zap-mcp-runtime.service other.service', null]) for (const action of ['inspect-runtime', 'inspect', 'stop', 'start', 'start-boot']) {
    const f = fixture(); (f.config as any).bootUnit = bootUnit;
    await assert.rejects(control(f.config, action, f.config.releases[0], 'offline', f.opts)); assert.deepEqual(f.effects, []);
  }
});

test('start-boot não contorna invariantes de Env e mounts', async () => {
  const f = fixture(); await control(f.config, 'start', f.config.releases[0], 'offline', f.opts);
  await control(f.config, 'stop', undefined, undefined, f.opts); f.effects.length = 0; f.containers[0].Config.Env[0] = 'ZAP_DATA_DIR=/wrong';
  await assert.rejects(control(f.config, 'start-boot', undefined, undefined, f.opts)); assert.deepEqual(f.effects, []);
});

test('persistência de boot falha fechada e nunca habilita unidade com estado não salvo', async () => {
  const f = fixture(); f.bootState.write = () => { throw Error('disk unavailable'); };
  await assert.rejects(control(f.config, 'start', f.config.releases[0], 'offline', f.opts), /disk unavailable/); assert.equal(f.enabled, false); assert.equal(f.state, null);
});

test('arquivo de estado inseguro bloqueia start antes de iniciar qualquer container', async () => {
  const f = fixture(); (f.bootState as any).prepare = () => { throw Error('unsafe root state file'); };
  await assert.rejects(control(f.config, 'start', f.config.releases[0], 'offline', f.opts), /unsafe root state file/);
  assert.equal(f.containers.some(c => c.State.Running), false); assert.deepEqual(f.effects, []);
});

test('unidade própria é observada em inspect-runtime com proxy ausente sem relaxar invariantes estáticas', async () => {
  const f = fixture(); f.enabled = true;
  const proxy = { name: 'proxy', network: 'proxy-net', expectedPeer: '172.18.0.2', publicOrigin: 'https://fixture.invalid' }; (f.config as any).proxy = proxy;
  for (const c of f.containers) {
    (c as any).NetworkSettings = { Networks: { 'proxy-net': {} } };
    c.Config.Env.push('ZAP_BIND_HOST=0.0.0.0', 'ZAP_TRUSTED_PROXY_PEERS=172.18.0.2', 'ZAP_PUBLIC_ORIGIN=https://fixture.invalid');
    const labels = c.Config.Labels as Record<string, string>; labels['traefik.http.routers.zap.rule'] = 'Host(`fixture.invalid`)'; labels['traefik.http.routers.zap.middlewares'] = 'zap-forwarding';
    for (const name of ['Forwarded', 'X-Forwarded-For', 'X-Forwarded-Host', 'X-Forwarded-Port', 'X-Forwarded-Server', 'X-Real-IP']) labels['traefik.http.middlewares.zap-forwarding.headers.customrequestheaders.' + name] = '';
    labels['traefik.http.middlewares.zap-forwarding.headers.customrequestheaders.X-Forwarded-Proto'] = 'https';
  }
  assert.equal((await control(f.config, 'inspect-runtime', undefined, undefined, f.opts)).autostart, true);
  await assert.rejects(control(f.config, 'inspect', undefined, undefined, f.opts)); assert.deepEqual(f.effects, []);
  f.containers[0].Config.Env[0] = 'ZAP_DATA_DIR=/wrong';
  await assert.rejects(control(f.config, 'inspect-runtime', undefined, undefined, f.opts)); assert.deepEqual(f.effects, []);
});

test('configuração antiga continua sem systemd nem estado de boot', async () => {
  const f = fixture(); delete (f.config as any).bootUnit;
  const started = await control(f.config, 'start', f.config.releases[0], 'offline', f.opts); assert.equal(started.running, true);
  const stopped = await control(f.config, 'stop', undefined, undefined, f.opts); assert.equal(stopped.autostart, false);
  assert.equal(f.state, null); assert.ok(!f.effects.some(effect => ['enable', 'disable', 'persist'].includes(effect)));
  await assert.rejects(control(f.config, 'start-boot', undefined, undefined, f.opts));
});

const pendingBoots = [
  { activeState: 'active', mainPID: process.pid, job: '' },
  { activeState: 'activating', mainPID: 0, job: '' },
  { activeState: 'inactive', mainPID: 0, job: '218' },
  { activeState: 'deactivating', mainPID: 0, job: '' }
];

test('inspect anuncia gatilho pendente mesmo quando unidade de boot está disabled', async () => {
  for (const boot of pendingBoots) for (const action of ['inspect', 'inspect-runtime']) {
    const f = fixture(); Object.assign(f.boot, boot);
    assert.equal((await control(f.config, action, undefined, undefined, f.opts)).autostart, true);
    assert.deepEqual(f.effects, []);
  }
});

test('stop e start externos recusam boot pendente antes de disable ou mutação Docker', async () => {
  for (const boot of pendingBoots) for (const action of ['stop', 'start']) {
    const f = fixture(); Object.assign(f.boot, boot);
    await assert.rejects(control(f.config, action, f.config.releases[0], 'offline', f.opts)); assert.deepEqual(f.effects, []);
  }
});

test('start-boot próprio com sudo ancestral real conclui ciclo sem matar sua unidade', async () => {
  const f = fixture(); f.enabled = true; Object.assign(f.boot, { activeState: 'activating', mainPID: process.ppid, job: '218' });
  f.state = { version: 1, machineId: 'a'.repeat(32), profilePathHash: profileHash, release: f.config.releases[1], mode: 'collect' };
  const facts = await control(f.config, 'start-boot', undefined, undefined, f.opts);
  assert.equal(facts.running, true); assert.equal(facts.release, f.config.releases[1]); assert.equal(facts.mode, 'collect');
  assert.equal(f.containers.filter(c => c.State.Running).length, 1); assert.equal(f.effects[0], 'disable'); assert.deepEqual(f.effects.slice(-4), ['start', 'update', 'persist', 'enable']);
});

test('start-boot externo não usa exceção de job queued ou de outra unidade em execução', async () => {
  for (const boot of [{ activeState: 'activating', mainPID: 0, job: '218' }, { activeState: 'active', mainPID: 4194304, job: '218' }]) {
    const f = fixture(); f.enabled = true; Object.assign(f.boot, boot);
    f.state = { version: 1, machineId: 'a'.repeat(32), profilePathHash: profileHash, release: f.config.releases[0], mode: 'offline' };
    await assert.rejects(control(f.config, 'start-boot', undefined, undefined, f.opts)); assert.deepEqual(f.effects, []);
  }
});

test('start-boot próprio valida estado e candidato antes de conceder exceção interna', async () => {
  for (const kind of ['state', 'candidate']) {
    const f = fixture(); f.enabled = true; Object.assign(f.boot, { activeState: 'activating', mainPID: process.ppid, job: '218' });
    f.state = { version: 1, machineId: kind === 'state' ? 'e'.repeat(32) : 'a'.repeat(32), profilePathHash: profileHash, release: f.config.releases[1], mode: 'collect' };
    if (kind === 'candidate') f.containers.splice(3, 1);
    await assert.rejects(control(f.config, 'start-boot', undefined, undefined, f.opts)); assert.deepEqual(f.effects, []);
  }
});

test('unidade oneshot concluída sem PID ou job pendente continua permitindo stop normal', async () => {
  const f = fixture(); f.boot.activeState = 'active';
  assert.equal((await control(f.config, 'inspect-runtime', undefined, undefined, f.opts)).autostart, false);
  assert.equal((await control(f.config, 'stop', undefined, undefined, f.opts)).autostart, false);
});
