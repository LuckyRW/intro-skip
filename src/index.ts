/** Add-on entry point: oss!idle imports this module and calls `mount` / `unmount`. */

import { Addon, defineAddon } from '@oss-idle/addon-sdk';
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
		this.log.info('ready - intros are skipped while the play screen is open');
	}
}

export const { mount, unmount } = defineAddon(() => new IntroSkip());
