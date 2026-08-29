(function () {
	'use strict';

	const DEFAULTS = self.BM_ANI_TOOL_DEFAULTS;
	const normalize = self.BM_ANI_TOOL_NORMALIZE;
	if (!DEFAULTS || !normalize) return;

	const features = [];
	let settings = normalize(null);
	let ready = false;

	function dispatch(next) {
		settings = normalize(next);
		for (const feature of features) {
			const on = !!settings[feature.key];
			if (feature.__lastState === on) continue;
			feature.__lastState = on;
			try {
				feature.setEnabled(on);
			} catch (_) {}
		}
	}

	self.bmAniTool = {
		register(feature) {
			if (!feature || !feature.key || typeof feature.setEnabled !== 'function') return;
			if (!Object.prototype.hasOwnProperty.call(DEFAULTS, feature.key)) return;
			feature.__lastState = null;
			features.push(feature);
			if (ready) dispatch(settings);
		},
	};

	try {
		chrome.storage.local.get(DEFAULTS, (data) => {
			ready = true;
			dispatch(data);
		});

		chrome.storage.onChanged.addListener((changes, area) => {
			if (area !== 'local') return;
			const next = { ...settings };
			let changed = false;
			for (const key of Object.keys(DEFAULTS)) {
				if (changes[key] && typeof changes[key].newValue === 'boolean') {
					next[key] = changes[key].newValue;
					changed = true;
				}
			}
			if (changed) dispatch(next);
		});
	} catch (_) {
		ready = true;
		dispatch(null);
	}
})();
