(function () {
	'use strict';

	if (!self.bmAniTool) return;

	const STYLE_ID = 'bm-ani-gamer-cover-image-fix-style';
	const TOUCH_ATTR = 'data-bm-ani-cover-touched';
	const POSTER_ORIG_ATTR = 'data-bm-ani-cover-orig-poster';
	const POSTER_BASES = [
		'#ani_video .vjs-poster',
		'#ani_video picture.vjs-poster',
		'video-js .vjs-poster',
		'video-js picture.vjs-poster',
		'#video-container video-js .vjs-poster',
		'#video-container video-js picture.vjs-poster',
	];
	const POSTER_SEL = POSTER_BASES.join(', ');
	const POSTER_PROPS = [
		'background-image',
		'background-size',
		'background-position',
		'background-repeat',
	];

	const META_SEL = [
		'meta[property="og:image"]',
		'meta[property="og:image:secure_url"]',
		'meta[name="twitter:image"]',
		'meta[name="thumbnail"]',
	];

	let enabled = false;
	let deb = null;
	let repumpId = 0;
	let repump = 0;

	function toAbs(s, base) {
		const t = String(s || '').trim();
		if (!t) return '';
		try {
			return new URL(t, base).href;
		} catch (_) {
			return '';
		}
	}

	function readCoverFromDocument(doc, baseHref) {
		if (!doc) return '';
		const base = baseHref || doc.baseURI || document.baseURI;
		const q = (sel) => doc.querySelector(sel);
		for (const sel of META_SEL) {
			const m = q(sel);
			if (m && m.content) {
				const r = toAbs(m.content, base);
				if (r) return r;
			}
		}
		const link = q('link[rel="image_src"]');
		if (link && link.href) return toAbs(link.href, base);
		return '';
	}

	function getEpisodeVideoFromDocument(doc) {
		const d = doc || document;
		const v =
			d.getElementById('ani_video_html5_api') ||
			d.querySelector('video-js video, #video-container video, .container-player video');
		return v && v.tagName === 'VIDEO' ? v : null;
	}

	function getEpisodeSpecificCoverFromDocument(doc) {
		if (!doc) return '';
		const base = doc.baseURI || document.baseURI;
		const v = getEpisodeVideoFromDocument(doc);
		if (v) {
			let p = (v.getAttribute(POSTER_ORIG_ATTR) || v.getAttribute('poster') || '').trim();
			if (!p) p = (v.getAttribute('data-poster') || '').trim();
			if (p) {
				const h = toAbs(p, base);
				if (h) return h;
			}
		}
		const vc = doc.getElementById('video-container');
		if (vc) {
			const p = vc.getAttribute('data-video-poster');
			if (p && p.trim()) {
				const h = toAbs(p.trim(), base);
				if (h) return h;
			}
		}
		return '';
	}

	function canReadTopDocument() {
		if (window === window.top) return false;
		try {
			return window.top.location.origin === window.location.origin;
		} catch (_) {
			return false;
		}
	}

	function getCoverImageUrl() {
		let u = getEpisodeSpecificCoverFromDocument(document);
		if (u) return u;
		u = readCoverFromDocument(document, document.baseURI);
		if (u) return u;
		if (canReadTopDocument()) {
			const td = window.top.document;
			u = getEpisodeSpecificCoverFromDocument(td);
			if (u) return u;
			u = readCoverFromDocument(td, td.baseURI);
			if (u) return u;
		}
		return '';
	}

	function getPlayerHost() {
		const byId = document.getElementById('ani_video');
		if (byId) return byId;
		const vc = document.getElementById('video-container');
		if (vc) {
			const vj = vc.querySelector('video-js.video-js, video-js, .video-js');
			if (vj) return vj;
		}
		return document.querySelector(
			'.container-player video-js, .videoframe video-js, #video-container video-js, .b-post video-js, video-js.video-js, .video-js'
		);
	}

	function getMainVideo() {
		const byApi = document.getElementById('ani_video_html5_api');
		if (byApi && byApi.tagName === 'VIDEO') return byApi;
		const w = document.querySelector('video-js video, .video-js video, #video-container video');
		if (w && w.tagName === 'VIDEO') return w;
		const h = getPlayerHost();
		if (h) {
			const v = h.querySelector('video');
			if (v && v.tagName === 'VIDEO') return v;
		}
		return null;
	}

	const PATH_OR_SN = /animeVideo\.php|\/video\//;
	const Q_SN = /(?:[?&])sn=/;

	function shouldApplyPage() {
		if (!/ani\.gamer\.com\.tw$/.test(location.hostname)) return false;
		if (PATH_OR_SN.test(location.pathname)) return true;
		if (Q_SN.test(location.search)) return true;
		if (Q_SN.test(String(location.hash || ''))) return true;
		if (getPlayerHost()) return true;
		return !!getMainVideo();
	}

	function buildCssText(imageUrl) {
		const u = JSON.stringify(imageUrl);
		return `
			#ani_video, #ani_video.video-js, #video-container video-js, #video-container .video-js,
			.container-player video-js, .container-player .video-js, .videoframe video-js, .b-post video-js, .b-post .video-js {
				background-color:#000 !important;
				background-image:url(${u}) !important;
				background-size:cover !important;
				background-position:center center !important;
				background-repeat:no-repeat !important;
			}
			#ani_video .vjs-poster, #ani_video picture.vjs-poster,
			#video-container video-js .vjs-poster, #video-container video-js picture.vjs-poster,
			.container-player video-js .vjs-poster, .container-player video-js picture.vjs-poster,
			.videoframe video-js .vjs-poster, .videoframe video-js picture.vjs-poster,
			.b-post video-js .vjs-poster, .b-post video-js picture.vjs-poster,
			video-js .vjs-poster, video-js picture.vjs-poster {
				display: none !important;
			}
			#ani_video:not(.vjs-has-started) video.vjs-tech, #ani_video:not(.vjs-has-started) .vjs-tech,
			#video-container video-js:not(.vjs-has-started) video.vjs-tech, #video-container video-js:not(.vjs-has-started) .vjs-tech {
				opacity:0 !important;
			}
			#ani_video.vjs-has-started video.vjs-tech, #ani_video.vjs-has-started .vjs-tech,
			#video-container video-js.vjs-has-started video.vjs-tech, #video-container video-js.vjs-has-started .vjs-tech {
				opacity:1 !important;
			}
			#ani_video .R18, #video-container video-js .R18, .container-player video-js .R18, .videoframe video-js .R18, .b-post video-js .R18, video-js .R18 {
				background-color: transparent !important;
				background-image: url(${u}) !important;
				background-size: cover !important;
				background-position: center center !important;
				background-repeat: no-repeat !important;
			}`;
	}

	function installStyle(url) {
		let el = document.getElementById(STYLE_ID);
		if (!el) {
			el = document.createElement('style');
			el.id = STYLE_ID;
			(document.head || document.documentElement).appendChild(el);
		}
		const css = buildCssText(url);
		if (el.textContent !== css) el.textContent = css;
	}

	function clearInjectedStyle() {
		const el = document.getElementById(STYLE_ID);
		if (el && el.textContent) el.textContent = '';
	}

	function applyPosterInline(url) {
		const escaped = String(url).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
		const bg = `url("${escaped}")`;
		try {
			document.querySelectorAll(POSTER_SEL).forEach((el) => {
				el.setAttribute(TOUCH_ATTR, 'poster');
				el.style.setProperty('background-image', bg, 'important');
				el.style.setProperty('background-size', 'cover', 'important');
				el.style.setProperty('background-position', 'center center', 'important');
				el.style.setProperty('background-repeat', 'no-repeat', 'important');
			});
			for (let i = 0; i < POSTER_BASES.length; i++) {
				document.querySelectorAll(`${POSTER_BASES[i]} img`).forEach((img) => {
					img.setAttribute(TOUCH_ATTR, 'img');
					img.style.setProperty('opacity', '0', 'important');
				});
			}
		} catch (_) {}
	}

	function clearPosterInline() {
		document.querySelectorAll(`[${TOUCH_ATTR}]`).forEach((el) => {
			if (el.getAttribute(TOUCH_ATTR) === 'img') {
				el.style.removeProperty('opacity');
			} else {
				POSTER_PROPS.forEach((p) => el.style.removeProperty(p));
			}
			el.removeAttribute(TOUCH_ATTR);
		});
	}

	function setVideoPoster(url) {
		const v = getMainVideo();
		if (!v) return;
		if (!v.hasAttribute(POSTER_ORIG_ATTR)) {
			v.setAttribute(POSTER_ORIG_ATTR, v.getAttribute('poster') || '');
		}
		if (v.getAttribute('poster') !== url) v.setAttribute('poster', url);
	}

	function restoreVideoPoster() {
		document.querySelectorAll(`video[${POSTER_ORIG_ATTR}]`).forEach((v) => {
			const orig = v.getAttribute(POSTER_ORIG_ATTR);
			if (orig) v.setAttribute('poster', orig);
			else v.removeAttribute('poster');
			v.removeAttribute(POSTER_ORIG_ATTR);
		});
	}

	let mainVideoHooked = null;
	const ON_VIDEO = ['play', 'playing', 'pause', 'loadeddata', 'emptied', 'seeked', 'loadstart', 'ended'];
	function hookMainVideoForPosterSync() {
		const v = getMainVideo();
		if (!v || mainVideoHooked === v) return;
		mainVideoHooked = v;
		for (let i = 0; i < ON_VIDEO.length; i++) {
			v.addEventListener(ON_VIDEO[i], schedule, { passive: true });
		}
	}

	function tick() {
		if (!enabled) return;
		if (!shouldApplyPage()) {
			clearInjectedStyle();
			return;
		}
		const url = getCoverImageUrl();
		if (!url) {
			clearInjectedStyle();
			return;
		}
		installStyle(url);
		applyPosterInline(url);
		setVideoPoster(url);
		hookMainVideoForPosterSync();
	}

	function schedule() {
		if (!enabled) return;
		clearTimeout(deb);
		deb = setTimeout(tick, 80);
	}

	function startRepump() {
		stopRepump();
		repump = 0;
		repumpId = setInterval(() => {
			tick();
			repump++;
			if (repump >= 24) stopRepump();
		}, 500);
	}

	function stopRepump() {
		if (repumpId) {
			clearInterval(repumpId);
			repumpId = 0;
		}
	}

	function revert() {
		stopRepump();
		clearTimeout(deb);
		clearInjectedStyle();
		clearPosterInline();
		restoreVideoPoster();
	}

	const ATTR_POSTER = ['data-video-poster', 'poster', 'data-poster'];
	if (document.body) {
		new MutationObserver(schedule).observe(document.body, {
			childList: true,
			subtree: true,
			attributes: true,
			attributeFilter: ATTR_POSTER,
		});
	}
	const vc0 = document.getElementById('video-container');
	if (vc0) {
		new MutationObserver(schedule).observe(vc0, {
			attributes: true,
			attributeFilter: ATTR_POSTER,
			subtree: true,
		});
	}
	if (canReadTopDocument()) {
		try {
			const vct = window.top.document.getElementById('video-container');
			if (vct) {
				new MutationObserver(schedule).observe(vct, {
					attributes: true,
					attributeFilter: ATTR_POSTER,
					subtree: true,
				});
			}
		} catch (_) {}
	}
	const head = document.head;
	if (head) {
		new MutationObserver(schedule).observe(head, {
			childList: true,
			subtree: true,
			attributes: true,
			attributeFilter: ['content', 'property', 'name'],
		});
	}
	window.addEventListener('pageshow', tick);
	window.addEventListener('popstate', schedule, { passive: true });
	for (const k of ['pushState', 'replaceState']) {
		const orig = history[k];
		if (typeof orig !== 'function') continue;
		history[k] = function () {
			const ret = orig.apply(this, arguments);
			schedule();
			return ret;
		};
	}

	self.bmAniTool.register({
		key: 'coverImage',
		setEnabled(on) {
			enabled = on;
			if (on) {
				tick();
				startRepump();
			} else {
				revert();
			}
		},
	});
})();
