(function (root) {
	'use strict';

	const DEFAULTS = {
		speed3x: true,
		coverImage: true,
		timeIndicator: false,
		theaterTopbar: true,
		hideAdblockPrompt: true,
	};

	root.BM_ANI_TOOL_DEFAULTS = DEFAULTS;

	root.BM_ANI_TOOL_NORMALIZE = function normalizeSettings(raw) {
		const out = {};
		for (const key of Object.keys(DEFAULTS)) {
			out[key] =
				raw && typeof raw[key] === 'boolean' ? raw[key] : DEFAULTS[key];
		}
		return out;
	};
})(typeof self !== 'undefined' ? self : window);
