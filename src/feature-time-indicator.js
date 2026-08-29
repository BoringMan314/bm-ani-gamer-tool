(function () {
	'use strict';

	if (!self.bmAniTool) return;

	const OFFSET_SEC = 90;
	const FIXED_SKIP_HOTKEY = 's';
	const MARKER_ID = 'ani-gamer-plus90-marker';
	const SKIP_DEBOUNCE_MS = 200;

	const doc = document;
	const win = window;

	let enabled = false;
	let video = null;
	let marker = null;
	let raf = 0;
	let vfWatch = null;
	let mountObserver = null;
	let lastSkipAt = 0;
	let fixedHotkeyHidden = false;

	function findVideo(root) {
		return (
			root.querySelector('#ani_video_html5_api') ||
			root.querySelector('.videoframe video') ||
			root.querySelector('video') ||
			null
		);
	}

	function findProgressHolder(root) {
		return (
			root.querySelector('.vjs-progress-holder') ||
			root.querySelector('.vjs-progress-control .vjs-slider')
		);
	}

	function ensureMarker(holder) {
		let el = holder.querySelector(`#${MARKER_ID}`);
		if (!el) {
			el = doc.createElement('div');
			el.id = MARKER_ID;
			el.setAttribute('aria-hidden', 'true');
			Object.assign(el.style, {
				position: 'absolute',
				top: '0',
				bottom: '0',
				width: '2px',
				marginLeft: '-1px',
				background: '#ffcc00',
				boxShadow: '0 0 2px rgba(0,0,0,0.45)',
				pointerEvents: 'none',
				zIndex: '5',
				display: 'none',
				left: '0%',
			});
			if (win.getComputedStyle(holder).position === 'static') {
				holder.style.position = 'relative';
			}
			holder.appendChild(el);
		}
		return el;
	}

	function removeMarker() {
		const el = doc.getElementById(MARKER_ID);
		if (el) el.remove();
		marker = null;
	}

	function updateMarker() {
		if (!video || !marker) return;
		const d = video.duration;
		if (!d || !isFinite(d) || d <= 0) {
			marker.style.display = 'none';
			return;
		}
		const t = video.currentTime + OFFSET_SEC;
		if (t > d) {
			marker.style.display = 'none';
			return;
		}
		marker.style.left = `${(t / d) * 100}%`;
		marker.style.display = 'block';
	}

	function cancelRaf() {
		if (raf) {
			win.cancelAnimationFrame(raf);
			raf = 0;
		}
	}

	function tick() {
		if (!enabled || !video || !marker || !video.isConnected) return;
		updateMarker();
		if (!video.paused) {
			raf = win.requestAnimationFrame(tick);
		}
	}

	function scheduleTick() {
		if (!enabled) return;
		cancelRaf();
		tick();
		if (video && !video.paused) {
			raf = win.requestAnimationFrame(tick);
		}
	}

	function onPlay() {
		scheduleTick();
	}

	function onPause() {
		cancelRaf();
		scheduleTick();
	}

	function bindVideo(v) {
		if (video === v) return;
		if (video) {
			video.removeEventListener('timeupdate', scheduleTick);
			video.removeEventListener('seeked', scheduleTick);
			video.removeEventListener('loadedmetadata', scheduleTick);
			video.removeEventListener('durationchange', scheduleTick);
			video.removeEventListener('play', onPlay);
			video.removeEventListener('pause', onPause);
		}
		video = v;
		if (!video) return;
		video.addEventListener('timeupdate', scheduleTick);
		video.addEventListener('seeked', scheduleTick);
		video.addEventListener('loadedmetadata', scheduleTick);
		video.addEventListener('durationchange', scheduleTick);
		video.addEventListener('play', onPlay);
		video.addEventListener('pause', onPause);
		scheduleTick();
	}

	function tryMount() {
		if (!enabled) return false;
		const v = findVideo(doc);
		const h = v ? findProgressHolder(doc) : null;
		if (!v || !h) return false;
		marker = ensureMarker(h);
		bindVideo(v);
		return true;
	}

	function watchVideoframe() {
		const vf = doc.querySelector('.videoframe');
		if (!vf || vfWatch) return;
		vfWatch = new MutationObserver(() => {
			if (!enabled) return;
			const h = findProgressHolder(doc);
			const m = doc.getElementById(MARKER_ID);
			if (h && (!m || !h.contains(m))) tryMount();
		});
		vfWatch.observe(vf, { childList: true, subtree: true });
	}

	function mount() {
		if (tryMount()) {
			watchVideoframe();
			return;
		}
		if (mountObserver) return;
		const root = doc.body || doc.documentElement;
		if (!root) return;
		mountObserver = new MutationObserver(() => {
			if (!enabled) return;
			if (tryMount()) {
				mountObserver.disconnect();
				mountObserver = null;
				watchVideoframe();
			}
		});
		mountObserver.observe(root, { childList: true, subtree: true });
	}

	function skip90() {
		if (!enabled) return;
		const now = Date.now();
		if (now - lastSkipAt < SKIP_DEBOUNCE_MS) return;
		lastSkipAt = now;
		const v = video && video.isConnected ? video : findVideo(doc);
		if (!v || !v.isConnected) return;
		const d = v.duration;
		if (!d || !isFinite(d) || d <= 0) return;
		v.currentTime = Math.min(d, v.currentTime + OFFSET_SEC);
	}

	async function refreshFixedHotkeyState() {
		try {
			const r = await chrome.runtime.sendMessage({ type: 'getSkipCommandState' });
			fixedHotkeyHidden = r?.commandShortcutCustomized === true;
		} catch (_) {
			fixedHotkeyHidden = false;
		}
	}

	chrome.runtime.onMessage.addListener((msg) => {
		if (!msg || msg.type !== 'skip90') return;
		skip90();
	});

	doc.addEventListener('visibilitychange', () => {
		if (enabled && doc.visibilityState === 'visible') refreshFixedHotkeyState();
	});

	win.addEventListener(
		'keydown',
		(e) => {
			if (!enabled || fixedHotkeyHidden) return;
			if (e.defaultPrevented) return;
			if (e.key.length !== 1 || e.key.toLowerCase() !== FIXED_SKIP_HOTKEY) return;
			if (e.ctrlKey || e.altKey || e.metaKey) return;
			const el = e.target;
			if (el && el.nodeType === 1) {
				const tag = el.tagName;
				if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable) {
					return;
				}
				if (el.closest && el.closest('input, textarea, select, [contenteditable="true"]')) {
					return;
				}
			}
			e.preventDefault();
			skip90();
		},
		true
	);

	win.addEventListener('load', () => {
		if (enabled) tryMount();
	});

	self.bmAniTool.register({
		key: 'timeIndicator',
		setEnabled(on) {
			enabled = on;
			if (on) {
				refreshFixedHotkeyState();
				mount();
				scheduleTick();
			} else {
				cancelRaf();
				removeMarker();
			}
		},
	});
})();
