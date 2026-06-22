// import { limitDateKey, limitedDomainsKey, limitsByDomainKey, usageByDomainKey } from './constants.js';

const defaultLimit = 5;
const limitsByDomainKey = 'limits-by-domain';
const usageByDomainKey = 'usage-by-domain';
const limitDateKey = 'limit-date';

/** @param {{ url: string, tabId: number }} details */
async function handleNavigation({ url, tabId }) {
  const { pathname, hostname } = parseUrl(url);
  if (!hostname || !pathname || !shouldLimitPath(hostname, pathname)) return;
  const stored = await browser.storage.local.get();

  /** @type {Record<string, number>} */
  const limitsByDomain = stored[limitsByDomainKey] || {};
  /** @type {Record<string, string[]>} */
  const usageByDomain = stored[usageByDomainKey] || {};
  /** @type {string} */
  const limitDate = stored[limitDateKey];

  if (!limitsByDomain.hasOwnProperty(hostname)) return;

  const visitedUrls = usageByDomain[hostname] || [];
  if (visitedUrls.includes(pathname)) return;

  const limit = limitsByDomain[hostname] || defaultLimit;
  browser.browserAction.setBadgeText({ text: (visitedUrls.length + 1).toString() + '/' + limit.toString(), tabId });

  if (visitedUrls.length >= Number(limit)) {
    browser.tabs.update(tabId, {
      url: browser.runtime.getURL('blocked/blocked.html'),
    });

    // prevent page load
    return { cancel: true };
  }

  if (limitDate !== new Date().toDateString()) {
    await browser.storage.local.set({
      [limitDateKey]: new Date().toDateString(),
      [usageByDomainKey]: { [hostname]: [pathname] },
    });
    return;
  }

  const newUsage = { ...usageByDomain, [hostname]: [...visitedUrls, pathname] };
  await browser.storage.local.set({ [usageByDomainKey]: newUsage });
}

browser.storage.local.get(limitsByDomainKey).then(({ [limitsByDomainKey]: limitsByDomain }) => {
  if (!limitsByDomain) return;
  const limitedDomains = Object.keys(limitsByDomain);
  const filter = { url: limitedDomains.map(domain => ({ hostContains: domain })) };
  browser.webNavigation.onCommitted.addListener(handleNavigation, filter);
  browser.webNavigation.onHistoryStateUpdated.addListener(handleNavigation, filter);
});

browser.storage.local.onChanged.addListener(async changes => {
  if (changes[limitsByDomainKey]) {
    const newDomains = changes[limitsByDomainKey].newValue || {};
    const newFilter = { url: Object.keys(newDomains).map(domain => ({ hostContains: domain })) };
    browser.webNavigation.onCommitted.removeListener(handleNavigation);
    browser.webNavigation.onHistoryStateUpdated.removeListener(handleNavigation);
    browser.webNavigation.onCommitted.addListener(handleNavigation, newFilter);
    browser.webNavigation.onHistoryStateUpdated.addListener(handleNavigation, newFilter);
  }
});

/**
 * @param {string} hostname
 * @param {string} pathname
 */
function shouldLimitPath(hostname, pathname) {
  if (!pathname || pathname === '/') return false;

  // YouTube
  if (hostname.startsWith('youtube') || hostname.startsWith('m.youtube')) {
    if (!pathname.startsWith('/watch')) return false;
  }

  // Reddit
  const isReddit = hostname.startsWith('reddit') || hostname.startsWith('old.reddit');
  if (isReddit && !pathname.includes('/comments')) return false;

  return true;
}

/** @param {string} domain */
function formatDomain(domain) {
  let formatted = domain.replace('www.', '').replace('https://', '').replace('http://', '');
  if (formatted.endsWith('/')) formatted = formatted.slice(0, -1);
  return formatted;
}

/** @param {string} url */
function parseUrl(url) {
  let { pathname = '', hostname = '', search } = URL.parse(url) || {};
  let formatted = hostname.replace('www.', '').replace('https://', '').replace('http://', '');
  if (formatted.endsWith('/')) formatted = formatted.slice(0, -1);

  // For YouTube can take different formats
  // /watch?v=abc
  // /watch/abc
  // /v/abc
  const isYouTube = formatted.startsWith('youtube') || formatted.startsWith('m.youtube');
  if (isYouTube) {
    const searchParams = new URLSearchParams(search);
    if (searchParams.has('v')) pathname = `/watch?v=${searchParams.get('v')}`;
  }

  return { hostname, pathname };
}
