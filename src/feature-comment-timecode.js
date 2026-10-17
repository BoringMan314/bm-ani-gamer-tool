(function () {
	'use strict';

	if (!self.bmAniTool || window.top !== window) return;

	const TIME_LINK = 'a[data-ani-video-timecode][data-ani-video-sn]';
	const PLAY_TIMEOUT_MS = 8000;
	const START_DELAY_MS = 400;
	const STORAGE_KEY = 'bmAniToolCommentTimecode';

	let enabled = false;
	let pending = null;
	let timer = 0;

	function parseTimecode(value) {
		const match = /^(?:(\d{1,2})_)?([0-5]?\d)_([0-5]\d)$/.exec(value || '');
		if (!match) return null;
		return Number(match[1] || 0) * 3600 + Number(match[2]) * 60 + Number(match[3]);
	}

	function findVideo() {
		return (
			document.getElementById('ani_video_html5_api') ||
			document.querySelector('.videoframe video, #video-container video, video') ||
			null
		);
	}

	function clearPending() {
		pending = null;
		try {
			window.sessionStorage.removeItem(STORAGE_KEY);
		} catch (_) {}
		if (timer) {
			window.clearTimeout(timer);
			timer = 0;
		}
	}

	function restorePending() {
		try {
			const saved = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY));
			const params = new URLSearchParams(window.location.search);
			if (
				saved &&
				Date.now() <= saved.expiresAt &&
				params.get('sn') === saved.sn &&
				params.get('t') === saved.timecode &&
				Number.isFinite(saved.seconds)
			) {
				pending = saved;
				return true;
			}
		} catch (_) {}
		clearPending();
		return false;
	}

	function applyPending() {
		timer = 0;
		if (!enabled || !pending) return;
		if (Date.now() > pending.expiresAt) {
			clearPending();
			return;
		}

		const params = new URLSearchParams(window.location.search);
		if (params.get('sn') !== pending.sn || params.get('t') !== pending.timecode) {
			timer = window.setTimeout(applyPending, 100);
			return;
		}

		const video = findVideo();
		if (!video || video.readyState < HTMLMediaElement.HAVE_METADATA) {
			timer = window.setTimeout(applyPending, 100);
			return;
		}

		const duration = video.duration;
		const target = Number.isFinite(duration)
			? Math.min(pending.seconds, Math.max(0, duration - 0.01))
			: pending.seconds;
		video.currentTime = target;
		video.play().catch(() => {});
		clearPending();
	}

	function onTimecodeClick(event) {
		if (!enabled || event.defaultPrevented || event.button !== 0) return;
		if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

		const link = event.target.closest(TIME_LINK);
		if (!link || !document.getElementById('w-post-box')?.contains(link)) return;
		const seconds = parseTimecode(link.dataset.aniVideoTimecode);
		if (seconds === null) return;

		clearPending();
		pending = {
			sn: String(link.dataset.aniVideoSn),
			seconds,
			timecode: link.dataset.aniVideoTimecode,
			expiresAt: Date.now() + PLAY_TIMEOUT_MS,
		};
		try {
			window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(pending));
		} catch (_) {}
		window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
		timer = window.setTimeout(applyPending, START_DELAY_MS);
	}

	self.bmAniTool.register({
		key: 'commentTimecode',
		setEnabled(on) {
			enabled = on;
			if (on) {
				document.addEventListener('click', onTimecodeClick, true);
				if (restorePending()) timer = window.setTimeout(applyPending, START_DELAY_MS);
			}
			else {
				document.removeEventListener('click', onTimecodeClick, true);
				clearPending();
			}
		},
	});
})();
