const YOUTUBE_URL_FILTER = {
  url: [{ hostContains: 'youtube.com' }],
};

const visitedVideoUrls = new Set();
const defaultLimit = 5;

/** @param {{ url: string, tabId: number }} details */
async function handleNavigation({ url, tabId }) {
  const { pathname } = URL.parse(url) || {};
  if (!pathname || pathname === '/' || !pathname.startsWith('/watch')) return;
  if (visitedVideoUrls.has(url)) return;

  visitedVideoUrls.add(url);

  const stored = await browser.storage.local.get();
  const limitDate = stored['yt-limit-date'];
  const limitUsed = stored['yt-limit-used'];
  const limit = stored['yt-limit'] || defaultLimit;

  if (limitDate !== new Date().toDateString()) {
    console.log('resetting limit');
    await browser.storage.local.set({ 'yt-limit-date': new Date().toDateString(), 'yt-limit-used': 1 });
    return;
  }

  if (limitUsed < limit) {
    console.log('incrementing limit', limitUsed);
    await browser.storage.local.set({ 'yt-limit-used': limitUsed + 1 });
    return;
  }

  browser.tabs.update(tabId, {
    url: browser.runtime.getURL('blocked.html'),
  });

  // prevent page load
  return { cancel: true };
}

browser.webNavigation.onCommitted.addListener(handleNavigation, YOUTUBE_URL_FILTER);
browser.webNavigation.onHistoryStateUpdated.addListener(handleNavigation, YOUTUBE_URL_FILTER);
