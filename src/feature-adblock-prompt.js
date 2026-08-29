(function () {
	'use strict';

	if (!self.bmAniTool) return;
	if (window !== window.top) return;

	const FEATURE_CLASS = 'bm-tool-hide-adblock';
	const ADBLOCK_HINT_RE =
		/擋廣告插件|广告阻挡插件|廣告阻擋工具的白名單|广告阻挡工具的白名单|福利社感謝您的支持/;
	const ADBLOCK_MARK = 'data-bm-tool-adblock-hidden';
	const ADBLOCK_WAS_OPEN = 'data-bm-tool-adblock-was-open';
	const OBS_READY = 'data-bm-tool-adblock-obs';
	const HIDDEN_CLASS = 'bm-tool-adblock-hidden';

	let enabled = false;
	let rafId = 0;

	function isAdblockPromptText(text) {
		return ADBLOCK_HINT_RE.test(text || '');
	}

	function closeDialog(dialog) {
		if (!dialog.open) return;
		dialog.setAttribute(ADBLOCK_WAS_OPEN, '1');
		try {
			dialog.close();
		} catch (_) {}
	}

	function hideDialog(dialog) {
		if (!dialog || !isAdblockPromptText(dialog.textContent)) return;
		if (dialog.getAttribute(ADBLOCK_MARK) === '1') {
			closeDialog(dialog);
			return;
		}

		dialog.setAttribute(ADBLOCK_MARK, '1');
		dialog.setAttribute(ADBLOCK_WAS_OPEN, '0');
		dialog.classList.add(HIDDEN_CLASS);
		closeDialog(dialog);
	}

	function hideMercyBanner() {
		document.querySelectorAll('a.alert-close').forEach((close) => {
			const banner = close.parentElement;
			if (!banner || !isAdblockPromptText(banner.textContent)) return;
			banner.setAttribute(ADBLOCK_MARK, '1');
			banner.classList.add(HIDDEN_CLASS);
		});
	}

	function hidePrompts() {
		if (!enabled) return;
		document.querySelectorAll('dialog.dialogify').forEach(hideDialog);
		hideMercyBanner();
	}

	function restorePrompts() {
		document.querySelectorAll(`[${ADBLOCK_MARK}="1"]`).forEach((el) => {
			el.classList.remove(HIDDEN_CLASS);
			const wasOpen = el.getAttribute(ADBLOCK_WAS_OPEN) === '1';
			el.removeAttribute(ADBLOCK_MARK);
			el.removeAttribute(ADBLOCK_WAS_OPEN);

			if (wasOpen && el.tagName === 'DIALOG' && typeof el.showModal === 'function') {
				try {
					el.showModal();
				} catch (_) {
					try {
						el.show();
					} catch (__) {}
				}
			}
		});

		try {
			localStorage.removeItem('admercyblocks');
		} catch (_) {}
	}

	function schedule() {
		if (!enabled) return;
		if (rafId) cancelAnimationFrame(rafId);
		rafId = requestAnimationFrame(() => {
			rafId = 0;
			hidePrompts();
		});
	}

	function attachObserver() {
		if (document.documentElement.getAttribute(OBS_READY) === '1') return;
		document.documentElement.setAttribute(OBS_READY, '1');

		new MutationObserver(schedule).observe(document.documentElement, {
			childList: true,
			subtree: true,
			attributes: true,
			attributeFilter: ['open', 'style', 'class'],
		});
	}

	attachObserver();

	self.bmAniTool.register({
		key: 'hideAdblockPrompt',
		setEnabled(on) {
			enabled = on;
			document.documentElement.classList.toggle(FEATURE_CLASS, on);
			if (on) hidePrompts();
			else restorePrompts();
		},
	});
})();
