// import { limitDateKey, limitedDomainsKey, limitsByDomainKey, usageByDomainKey } from './constants.js';

const defaultLimit = 5;
const limitsByDomainKey = 'limits-by-domain';
const usageByDomainKey = 'usage-by-domain';
const limitDateKey = 'limit-date';
const blockSubredditsKey = 'block-subreddits';
const blockAllRedditKey = 'block-all-reddit';
const enableLockKey = 'enable-lock';
const showOverlayKey = 'show-overlay';

/** @param {{ url: string, tabId: number }} details */
async function handleNavigation({ url, tabId }) {
  const { pathname, hostname } = parseUrl(url);
  if (!hostname || !pathname) return;
  const stored = await browser.storage.local.get();

  // Reddit-specific checks
  if (stored[blockAllRedditKey] && checkIsReddit(hostname)) return blockLoad(tabId);
  if (stored[blockSubredditsKey] && checkIsBlockableReddit(hostname, pathname)) return blockLoad(tabId);
  if (!shouldLimitPath(hostname, pathname)) return;

  /** @type {Record<string, number>} */
  const limitsByDomain = stored[limitsByDomainKey] || {};
  /** @type {Record<string, string[]>} */
  const usageByDomain = stored[usageByDomainKey] || {};
  /** @type {string} */
  const limitDate = stored[limitDateKey];
  if (limitDate !== new Date().toDateString()) {
    await browser.storage.local.set({
      [limitDateKey]: new Date().toDateString(),
      [usageByDomainKey]: { [hostname]: [pathname] },
    });
    return;
  }

  if (!limitsByDomain.hasOwnProperty(hostname)) return;

  const visitedUrls = usageByDomain[hostname] || [];
  if (visitedUrls.includes(pathname)) return;

  const limit = limitsByDomain[hostname] || defaultLimit;

  if (visitedUrls.length >= Number(limit)) {
    return blockLoad(tabId);
  }
  browser.browserAction.setBadgeText({ text: (visitedUrls.length + 1).toString() + '/' + limit.toString(), tabId });

  const newUsage = { ...usageByDomain, [hostname]: [...visitedUrls, pathname] };
  await browser.storage.local.set({ [usageByDomainKey]: newUsage });
}

browser.storage.local.get([limitsByDomainKey, blockAllRedditKey, blockSubredditsKey]).then(stored => {
  const limitsByDomain = stored[limitsByDomainKey];
  const blockAllReddit = stored[blockAllRedditKey];
  const blockSubreddits = stored[blockSubredditsKey];

  if (!limitsByDomain && !blockAllReddit && !blockSubreddits) return;
  const limitedDomains = Object.keys(limitsByDomain || {});
  if ((blockAllReddit || blockSubreddits) && !limitedDomains.some(domain => domain.includes('reddit.com'))) {
    limitedDomains.push('reddit.com');
  }
  if (!limitedDomains.length) return;
  const filter = { url: limitedDomains.map(domain => ({ hostContains: domain })) };
  browser.webNavigation.onCommitted.addListener(handleNavigation, filter);
  browser.webNavigation.onHistoryStateUpdated.addListener(handleNavigation, filter);
});

browser.storage.local.onChanged.addListener(async changes => {
  const addingRedditBlock = changes[blockAllRedditKey]?.newValue || changes[blockSubredditsKey]?.newValue;
  if (changes[limitsByDomainKey] || addingRedditBlock) {
    const newDomains = Object.keys(changes[limitsByDomainKey]?.newValue || {});
    if (addingRedditBlock && !newDomains.some(domain => domain.includes('reddit.com'))) {
      newDomains.push('reddit.com');
    }
    const newFilter = { url: newDomains.map(domain => ({ hostContains: domain })) };
    browser.webNavigation.onCommitted.removeListener(handleNavigation);
    browser.webNavigation.onHistoryStateUpdated.removeListener(handleNavigation);
    browser.webNavigation.onCommitted.addListener(handleNavigation, newFilter);
    browser.webNavigation.onHistoryStateUpdated.addListener(handleNavigation, newFilter);
  }
});

/** @param {number} tabId */
function blockLoad(tabId) {
  browser.tabs.update(tabId, {
    url: browser.runtime.getURL('blocked/blocked.html'),
  });

  // prevent page load
  return { cancel: true };
}

/**
 * @param {string} hostname
 * @param {string} pathname
 */
function shouldLimitPath(hostname, pathname) {
  if (!pathname || pathname === '/') return false;

  if (!checkIsBlockableReddit(hostname, pathname)) return false;

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
  hostname = hostname.replace('www.', '').replace('https://', '').replace('http://', '');
  if (hostname.endsWith('/')) hostname = hostname.slice(0, -1);

  // For YouTube can take different formats
  // /watch?v=abc
  // /watch/abc
  // /v/abc
  const isYouTube = hostname.startsWith('youtube') || hostname.startsWith('m.youtube');
  if (isYouTube) {
    const searchParams = new URLSearchParams(search);
    if (searchParams.has('v')) pathname = `/watch?v=${searchParams.get('v')}`;
  }

  return { hostname, pathname };
}

/**
 * @param {string} hostname
 * @param {string} pathname
 */
function checkIsBlockableReddit(hostname, pathname) {
  const isReddit = checkIsReddit(hostname);
  if (isReddit && pathname.includes('/comments')) return false;
  return isReddit;
}

/**
 * @param {string} hostname
 */
function checkIsReddit(hostname) {
  return hostname.startsWith('reddit') || hostname.startsWith('old.reddit');
}
