// import { limitDateKey, limitedDomainsKey, limitsByDomainKey, usageByDomainKey } from './constants.js';

const defaultLimit = 5;
const limitsByDomainKey = 'limits-by-domain';
const usageByDomainKey = 'usage-by-domain';
const limitDateKey = 'limit-date';

/** @param {{ url: string, tabId: number }} details */
async function handleNavigation({ url, tabId }) {
  const { pathname, hostname } = URL.parse(url) || {};
  if (!hostname || !pathname || !shouldLimitPath(pathname)) return;
  const stored = await browser.storage.local.get();
  const domain = formatDomain(hostname);

  /** @type {Record<string, number>} */
  const limitsByDomain = stored[limitsByDomainKey] || {};
  /** @type {Record<string, string[]>} */
  const usageByDomain = stored[usageByDomainKey] || {};
  /** @type {string} */
  const limitDate = stored[limitDateKey];

  if (!limitsByDomain.hasOwnProperty(domain)) return;

  const visitedUrls = usageByDomain[domain] || [];
  if (visitedUrls.includes(pathname)) return;

  const limit = limitsByDomain[domain] || defaultLimit;
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
      [usageByDomainKey]: { [domain]: [pathname] },
    });
    return;
  }

  const newUsage = { ...usageByDomain, [domain]: [...visitedUrls, pathname] };
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

/** @param {string} pathname */
function shouldLimitPath(pathname) {
  if (!pathname || pathname === '/') return false;

  // YouTube
  if (pathname.startsWith('/watch')) return false;

  // Reddit
  if (pathname.startsWith('/r/') && !pathname.includes('/comments')) return false;

  return true;
}

/** @param {string} domain */
function formatDomain(domain) {
  let formatted = domain.replace('www.', '').replace('https://', '').replace('http://', '');
  if (formatted.endsWith('/')) formatted = formatted.slice(0, -1);
  return formatted;
}
