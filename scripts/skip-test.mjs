/** The intro skip, against a stand-in for the play screen. */
import { build } from 'esbuild';
import { rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, '.test.mjs');
await build({
	entryPoints: [join(root, 'src/skip.ts')], outfile: out, bundle: true, format: 'esm', platform: 'node',
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

console.log(`${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
