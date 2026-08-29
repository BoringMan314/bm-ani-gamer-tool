(function () {
	'use strict';

	if (window.__bmAni3xLoaded) return;
	window.__bmAni3xLoaded = true;

	const EXTRA_RATE = 3;
	const FLAG_ATTR = 'data-bm-ani-3x';
	const ITEM_ATTR = 'data-bm-ani-3x-item';

	function isEnabled() {
		return document.documentElement.getAttribute(FLAG_ATTR) === '1';
	}

	function getHost() {
		const a = document.getElementById('ani_video');
		if (a) return a;
		const vc = document.getElementById('video-container');
		if (vc) {
			const vj = vc.querySelector('video-js.video-js, .video-js');
			if (vj) return vj;
		}
		return document.querySelector('.container-player .video-js');
	}

	function getMainVideo() {
		const byApi = document.getElementById('ani_video_html5_api');
		if (byApi && byApi.tagName === 'VIDEO') return byApi;
		const host = getHost();
		if (host) {
			const v = host.querySelector('video');
			if (v) return v;
		}
		return document.querySelector('#video-container video');
	}

	function getMenuContent() {
		const host = getHost();
		if (host) {
			const m = host.querySelector('.vjs-playback-rate .vjs-menu-content');
			if (m) return m;
		}
		return document.querySelector('#video-container .vjs-playback-rate .vjs-menu-content');
	}

	function bindMenuClick(menuContent) {
		if (menuContent.__bmAni3xBound) return;
		menuContent.__bmAni3xBound = true;
		menuContent.addEventListener(
			'click',
			function (e) {
				if (!isEnabled()) return;
				const t = e.target;
				if (!t || !t.closest) return;
				if (!t.closest(`[${ITEM_ATTR}]`)) return;
				e.stopImmediatePropagation();
				e.preventDefault();
				const v = getMainVideo();
				if (v) v.playbackRate = EXTRA_RATE;
			},
			true
		);
	}

	function ensureMenuItem() {
		const menuContent = getMenuContent();
		if (!menuContent) return;
		bindMenuClick(menuContent);
		if (menuContent.querySelector(`[${ITEM_ATTR}]`)) return;
		const sample = menuContent.querySelector('.vjs-menu-item');
		if (!sample) return;
		const node = sample.cloneNode(true);
		node.setAttribute(ITEM_ATTR, '1');
		node.classList.remove('vjs-selected');
		const txt = node.querySelector('.vjs-menu-item-text');
		if (txt) txt.textContent = EXTRA_RATE + 'x';
		menuContent.insertBefore(node, menuContent.firstElementChild || menuContent.firstChild);
	}

	function removeMenuItem() {
		document.querySelectorAll(`[${ITEM_ATTR}]`).forEach(function (el) {
			el.remove();
		});
	}

	function tick() {
		if (!isEnabled()) {
			removeMenuItem();
			return;
		}
		ensureMenuItem();
	}

	setInterval(tick, 400);
	tick();

	new MutationObserver(tick).observe(document.documentElement, {
		attributes: true,
		attributeFilter: [FLAG_ATTR],
	});

	const root = document.getElementById('video-container');
	if (root) {
		let deb = null;
		new MutationObserver(function () {
			clearTimeout(deb);
			deb = setTimeout(tick, 120);
		}).observe(root, { childList: true, subtree: true });
	}
})();
