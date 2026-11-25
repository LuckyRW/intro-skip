/** The intro skip, against a stand-in for the play screen. */
import { build } from 'esbuild';
import { rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, '.test.mjs');
await build({
	entryPoints: [join(root, 'scripts/entry.ts')], outfile: out, bundle: true, format: 'esm', platform: 'node',
	target: 'es2022', logLevel: 'error',
});
const m = await import(pathToFileURL(out).href);
rmSync(out);

let pass = 0, fail = 0;
const check = (name, ok, extra = '') => { ok ? pass++ : (fail++, console.log('  FAIL:', name, extra)); };

// the play screen's fiber: Gameplay keeps the game in a ref
let now = 1000;
const game = { now: () => now, songStartMs: 8000, notes: [] };
const canvas = { __reactFiber$x: { memoizedState: null, return: { memoizedState: { memoizedState: { current: game }, next: null } } } };
check('the clock is read from the play screen', m.clockOf(canvas) === game);
check('it skips while the intro has time left', m.shouldSkip(m.clockOf(canvas)));
now = 6500;
check('it stops within two seconds of the first note', !m.shouldSkip(m.clockOf(canvas)));
check('a clock it cannot read still presses: the game gates it', m.shouldSkip(m.clockOf({})));

globalThis.KeyboardEvent = class { constructor(type, init) { Object.assign(this, { type }, init); } };
const sent = [];
m.pressSkip({ dispatchEvent: event => sent.push(`${event.type}:${event.key}`) });
check('it presses and releases Space', sent.join() === 'keydown: ,keyup: ', sent.join());

// background: the game's socket, caught on its first send
{
	const sentRaw = [];
	const proto = { send(data) { sentRaw.push(data); } };
	let screen = false;
	const w = m.watchSocket(proto, () => screen);
	const listeners = [];
	const sock = { url: 'wss://x/v1/ws?tz=UTC', readyState: 1, addEventListener: (t, h) => listeners.push(h), removeEventListener: () => listeners.pop() };
	proto.send.call(sock, 'hello');
	check('the game socket is caught on a send', listeners.length === 1);
	const push = (state) => listeners.forEach(h => h({ data: JSON.stringify({ type: 'play:state', state }) }));
	push({ phase: 'active', token: 'abc' });
	check('a new play is skipped', sentRaw.includes(JSON.stringify({ type: 'play:skip', token: 'abc' })), sentRaw.join());
	push({ phase: 'active', token: 'abc' });
	check('a play is skipped once', sentRaw.filter(d => d.includes('play:skip')).length === 1);
	screen = true; push({ phase: 'active', token: 'def' });
	check('the play screen skips by itself', !sentRaw.some(d => d.includes('def')));
	const other = { url: 'wss://y/other', addEventListener: () => listeners.push(0), removeEventListener() {} };
	proto.send.call(other, 'x');
	check('other sockets are left alone', listeners.length === 1);
	const before = proto.send; w.stop();
	check('stop puts send back', proto.send !== before && listeners.length === 0);
}

console.log(`${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
