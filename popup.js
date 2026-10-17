(function () {
	'use strict';

	const DEFAULTS = self.BM_ANI_TOOL_DEFAULTS;
	const normalize = self.BM_ANI_TOOL_NORMALIZE;
	const SHORTCUTS_URL = 'chrome://extensions/shortcuts';

	function applyI18n() {
		const lang = chrome.i18n.getUILanguage();
		if (lang) document.documentElement.lang = lang;
		document.querySelectorAll('[data-i18n]').forEach((el) => {
			const key = el.getAttribute('data-i18n');
			const msg = chrome.i18n.getMessage(key);
			if (msg) el.textContent = msg;
		});
		const title = chrome.i18n.getMessage('extName');
		if (title) document.title = title;
	}

	async function loadSettings() {
		return normalize(await chrome.storage.local.get(DEFAULTS));
	}

	function bindShortcutsLink() {
		const btn = document.getElementById('openShortcuts');
		if (!btn) return;
		btn.addEventListener('click', () => {
			chrome.tabs.create({ url: SHORTCUTS_URL });
			window.close();
		});
	}

	async function updateSkipDescription() {
		const desc = document.getElementById('timeIndicatorDesc');
		if (!desc) return;
		try {
			const state = await chrome.runtime.sendMessage({ type: 'getSkipCommandState' });
			const key = state?.commandShortcutCustomized
				? 'optMarkerDescCustom'
				: 'optMarkerDescDefault';
			const shortcut = state?.commandShortcutCustomized
				? state.shortcut
				: state?.defaultShortcut || state?.shortcut || '';
			const message = chrome.i18n.getMessage(key, shortcut);
			if (message) desc.textContent = message;
		} catch (_) {}
	}

	async function init() {
		applyI18n();
		bindShortcutsLink();
		updateSkipDescription();

		const settings = await loadSettings();
		for (const key of Object.keys(DEFAULTS)) {
			const input = document.getElementById(key);
			if (!input) continue;
			input.checked = settings[key];
			input.addEventListener('change', () => {
				chrome.storage.local.set({ [key]: input.checked });
			});
		}
	}

	init();
})();
