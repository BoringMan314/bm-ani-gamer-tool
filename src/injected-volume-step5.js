(function () {
	'use strict';

	if (window.__bmAniVolumeStep5Loaded) return;
	window.__bmAniVolumeStep5Loaded = true;

	const FLAG_ATTR = 'data-bm-ani-volume-step5';
	const STEP = 0.05;
	let keyDirection = 0;
	let clearDirectionTimer = 0;

	function isEnabled() {
		return document.documentElement?.getAttribute(FLAG_ATTR) === '1';
	}

	function nextVolume(volume, direction) {
		if (!Number.isFinite(volume)) return volume;

		const currentStep = volume / STEP;
		const nextStep =
			direction > 0
				? Math.floor(currentStep + 1e-5) + 1
				: Math.ceil(currentStep - 1e-5) - 1;
		const snapped = Math.round(Math.max(0, Math.min(1 / STEP, nextStep)) * STEP * 100) / 100;
		// The site's HUD uses Math.ceil(volume * 100); bias down by a few ULPs
		// so exact steps such as 55% are not displayed as 56%.
		return snapped === 0 ? 0 : snapped - Number.EPSILON * 2;
	}

	function trackVolumeKey(event) {
		if (!isEnabled()) return;

		if (event.key === 'ArrowUp' || event.keyCode === 38) {
			keyDirection = 1;
		} else if (event.key === 'ArrowDown' || event.keyCode === 40) {
			keyDirection = -1;
		} else {
			return;
		}

		window.clearTimeout(clearDirectionTimer);
		// Keep the direction through the site's remaining keydown handlers.
		clearDirectionTimer = window.setTimeout(() => {
			keyDirection = 0;
		}, 0);
	}

	function patchNativeVolumeSetter() {
		const prototype = window.HTMLMediaElement && window.HTMLMediaElement.prototype;
		if (!prototype || prototype.__bmAniVolumeStep5SetterPatched) return;

		const descriptor = Object.getOwnPropertyDescriptor(prototype, 'volume');
		if (!descriptor || typeof descriptor.get !== 'function' || typeof descriptor.set !== 'function') {
			return;
		}

		Object.defineProperty(prototype, 'volume', {
			...descriptor,
			set(value) {
				if (keyDirection && isEnabled()) {
					value = nextVolume(descriptor.get.call(this), keyDirection);
				}
				descriptor.set.call(this, value);
			},
		});
		prototype.__bmAniVolumeStep5SetterPatched = true;
	}

	window.addEventListener('keydown', trackVolumeKey, true);
	patchNativeVolumeSetter();
})();
