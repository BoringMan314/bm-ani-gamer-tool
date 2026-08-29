function normalizeShortcut(s) {
	return String(s || '')
		.toLowerCase()
		.replace(/\s+/g, '');
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
	if (msg?.type !== 'getSkipCommandState') return;
	(async () => {
		try {
			const manifest = chrome.runtime.getManifest();
			const suggested = manifest.commands?.skip90?.suggested_key || {};
			const info = await chrome.runtime.getPlatformInfo();
			const defaultShortcut =
				info.os === 'mac'
					? suggested.mac || suggested.default || ''
					: suggested.default || suggested.mac || '';
			const list = await chrome.commands.getAll();
			const skip = list.find((c) => c.name === 'skip90');
			const shortcut = skip?.shortcut || '';
			const commandShortcutCustomized =
				shortcut.length > 0 && normalizeShortcut(shortcut) !== normalizeShortcut(defaultShortcut);
			sendResponse({ commandShortcutCustomized });
		} catch (_) {
			sendResponse({ commandShortcutCustomized: false });
		}
	})();
	return true;
});

chrome.commands.onCommand.addListener(async (command) => {
	if (command !== 'skip90') return;
	const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
	if (!tab?.id) return;
	try {
		await chrome.tabs.sendMessage(tab.id, { type: 'skip90' });
	} catch (_) {}
});
