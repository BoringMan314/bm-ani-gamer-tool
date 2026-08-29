(function () {
	'use strict';

	if (!self.bmAniTool) return;

	const FLAG_ATTR = 'data-bm-ani-3x';
	let injected = false;

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
			if (on) injectPageScript();
		},
	});
})();
