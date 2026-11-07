(function () {
	'use strict';

	if (!self.bmAniTool) return;

	const FLAG_ATTR = 'data-bm-ani-volume-step5';

	self.bmAniTool.register({
		key: 'volumeStep5',
		setEnabled(on) {
			document.documentElement.setAttribute(FLAG_ATTR, on ? '1' : '0');
		},
	});
})();
