/**
 * Skipping intros with the play screen closed.
 *
 * The SDK has no hold on the game's socket, so it is caught the first time the
 * game sends on it (every `WebSocket.send` passes through the patch below, and
 * the one whose URL ends in `/v1/ws` is the game's). Its `play:state` pushes
 * name each new play's token; the add-on then sends the same `play:skip` the
 * play screen's SKIP sends. The server moves the play earlier by whatever is
 * left of the intro, and ignores the skip once the first note has passed.
 */

/** The game's community socket, by its URL. */
export const isGameSocket = (url: string) => /\/v1\/ws(\?|$)/.test(url);

type Sock = Pick<WebSocket, 'url' | 'readyState' | 'send' | 'addEventListener' | 'removeEventListener'>;

/** The token of a newly active play in a raw socket message, else undefined. */
export const activeToken = (data: unknown): string | undefined => {
	if (typeof data !== 'string' || !data.includes('play:state')) return undefined;
	try {
		const msg = JSON.parse(data);
		return msg?.type === 'play:state' && msg.state?.phase === 'active' && typeof msg.state.token === 'string'
			? msg.state.token : undefined;
	} catch {
		return undefined;
	}
};

export type Watcher = {
	/** Stop watching and put `WebSocket.prototype.send` back. */
	stop: () => void,
};

/**
 * Watch the game's socket and skip each new play's intro, unless
 * `screenOpen()` says the play screen is showing (it skips there itself).
 */
export const watchSocket = (
	proto: { send: (this: Sock, data: unknown) => void },
	screenOpen: () => boolean,
	log: (text: string) => void = () => {},
): Watcher => {
	const original = proto.send;
	let sock: Sock | undefined;
	const skipped = new Set<string>();

	const onMessage = (e: Event) => {
		const token = activeToken((e as MessageEvent).data);
		if (!token || skipped.has(token) || !sock) return;
		skipped.add(token);
		if (skipped.size > 50) skipped.delete(skipped.values().next().value as string);
		if (screenOpen()) return;
		original.call(sock, JSON.stringify({ type: 'play:skip', token }));
		log(`skipped the intro of play ${token.slice(0, 8)}`);
	};
	const attach = (next: Sock) => {
		if (sock === next) return;
		sock?.removeEventListener('message', onMessage);
		sock = next;
		sock.addEventListener('message', onMessage);
	};

	proto.send = function (this: Sock, data: unknown) {
		if (this && typeof this.url === 'string' && isGameSocket(this.url)) attach(this);
		return original.call(this, data);
	};
	return {
		stop: () => {
			proto.send = original;
			sock?.removeEventListener('message', onMessage);
			sock = undefined;
		},
	};
};
