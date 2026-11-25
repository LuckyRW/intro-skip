/** Add-on entry point: oss!idle imports this module and calls `mount` / `unmount`. */

import { Addon, defineAddon } from '@oss-idle/addon-sdk';
import { watchSocket } from './background.js';
import { clockOf, pressSkip, shouldSkip } from './skip.js';

/** How often the play screen is checked. */
const CHECK_MS = 500;

class IntroSkip extends Addon {

	constructor() {
		super({ name: 'Intro Skip' });
	}

	protected onMount(): void {
		this.interval(() => {
			const canvas = document.querySelector('.play__canvas');
			if (canvas && shouldSkip(clockOf(canvas))) pressSkip(window);
		}, CHECK_MS);
		// off the play screen: the same skip, sent on the game's socket
		const watcher = watchSocket(
			WebSocket.prototype as never,
			() => !!document.querySelector('.play__canvas'),
			text => this.log.info(text),
		);
		this.own(() => watcher.stop());
		this.log.info('ready - intros are skipped on the play screen, and in the background while the game is open');
	}
}

export const { mount, unmount } = defineAddon(() => new IntroSkip());
