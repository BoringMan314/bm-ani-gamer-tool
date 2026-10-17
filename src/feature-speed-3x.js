(function () {
	'use strict';

	if (!self.bmAniTool) return;

	const FLAG_ATTR = 'data-bm-ani-3x';
	const RATE_ATTR = 'data-bm-ani-remembered-rate';
	const RATE_KEY = chrome.extension.inIncognitoContext
		? 'speed3xRememberedRateIncognito'
		: 'speed3xRememberedRate';
	let injected = false;
	let initialized = false;

	function getMenuRate(target) {
		const item = target?.closest?.('.vjs-playback-rate .vjs-menu-item');
		if (!item) return null;
		const text = item.querySelector('.vjs-menu-item-text')?.textContent || item.textContent;
		const match = /^\s*(\d+(?:\.\d+)?)\s*x\s*$/i.exec(text || '');
		const rate = Number(match?.[1]);
		return Number.isFinite(rate) && rate > 0 && rate <= 16 ? rate : null;
	}

	function onRateMenuClick(event) {
		const rate = getMenuRate(event.target);
		if (rate === null) return;
		document.documentElement.setAttribute(RATE_ATTR, String(rate));
		chrome.storage.local.set({ [RATE_KEY]: rate }).catch(() => {});
	}

	async function restoreRate() {
		try {
			const stored = await chrome.storage.local.get(RATE_KEY);
			if (document.documentElement.getAttribute(FLAG_ATTR) !== '1') return;
			const rate = Number(stored[RATE_KEY]);
			if (Number.isFinite(rate) && rate > 0 && rate <= 16) {
				document.documentElement.setAttribute(RATE_ATTR, String(rate));
				return;
			}
		} catch (_) {}
		document.documentElement.removeAttribute(RATE_ATTR);
	}

	function forgetRate() {
		document.documentElement.removeAttribute(RATE_ATTR);
		chrome.storage.local.remove(RATE_KEY).catch(() => {});
		document.dispatchEvent(new CustomEvent('bmAni3xResetRate'));
	}

	function injectPageScript() {
		if (injected) return;
		injected = true;
		const s = document.createElement('script');
		s.src = chrome.runtime.getURL('src/injected-speed-3x.js');
		s.onload = function () {
			s.remove();
		};
		(document.head || document.documentElement).appendChild(s);
	}

	self.bmAniTool.register({
		key: 'speed3x',
		setEnabled(on) {
			document.documentElement.setAttribute(FLAG_ATTR, on ? '1' : '0');
			if (on) {
				injectPageScript();
				document.addEventListener('click', onRateMenuClick, true);
				restoreRate();
			} else {
				document.removeEventListener('click', onRateMenuClick, true);
				if (initialized) forgetRate();
			}
			initialized = true;
		},
	});
})();
