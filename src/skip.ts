/**
 * Skipping a play's intro, as the game's own SKIP does.
 *
 * The game hands add-ons nothing for this, so the play is found by walking
 * React's fiber tree from its canvas, and the skip is the game's own key:
 * Space, which skips while the intro still has two seconds or more to go and
 * tells the server, so the play ends that much sooner.
 */

/** The game only skips while the first note is at least this far off. */
export const SKIP_GATE_MS = 2000;

type Fiber = { return?: Fiber | null; memoizedState?: unknown };
type Hook = { memoizedState?: unknown; next?: Hook | null };
/** What the play screen keeps of the map's clock. */
export type Clocked = { now: () => number; songStartMs: number };

const isClocked = (value: unknown): value is Clocked =>
	!!value && typeof value === 'object'
	&& typeof (value as Clocked).now === 'function' && typeof (value as Clocked).songStartMs === 'number';

/** The running play's clock, from the fiber tree above `canvas`; undefined when it is not found. */
export const clockOf = (canvas: Element): Clocked | undefined => {
	const key = Object.keys(canvas).find(name => name.startsWith('__reactFiber'));
	for (let fiber = key ? (canvas as unknown as Record<string, Fiber>)[key] : undefined; fiber; fiber = fiber.return ?? undefined) {
		for (let hook = fiber.memoizedState as Hook | null | undefined; hook && typeof hook === 'object' && 'next' in hook; hook = hook.next) {
			const state = hook.memoizedState;
			const found = [state, (state as { current?: unknown } | null | undefined)?.current].find(isClocked);
			if (found) return found;
		}
	}
	return undefined;
};

/** Whether to press skip now: while the intro has time left, or always when the clock can't be read, since the game's own gate stops a press too late. */
export const shouldSkip = (clock: Clocked | undefined): boolean =>
	!clock || clock.now() < clock.songStartMs - SKIP_GATE_MS;

/** Press and release Space, the game's skip key. */
export const pressSkip = (target: Window) => {
	for (const type of ['keydown', 'keyup'] as const) {
		target.dispatchEvent(new KeyboardEvent(type, { key: ' ', code: 'Space', bubbles: true }));
	}
};
