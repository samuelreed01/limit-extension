import { defaultLimit, formatDomain, limitDateKey, limitsByDomainKey, usageByDomainKey } from '../constants.js';

window.addEventListener('load', async () => {
  const [tab] = await browser.tabs.query({
    active: true,
    currentWindow: true,
  });
  if (!tab?.url) return;
  const { hostname } = new URL(tab.url);
  if (!hostname) return;
  const domain = formatDomain(hostname);

  const domainSpan = document.querySelector('.domain-span');
  if (domainSpan) {
    domainSpan.textContent = domain;
  }

  const settingsButton = document.getElementById('settings-button');
  if (settingsButton) {
    settingsButton.addEventListener('click', () => {
      browser.runtime.openOptionsPage();
    });
  }

  const storage = await browser.storage.local.get();
  const limitDate = storage[limitDateKey];
  const limitUsed = storage[usageByDomainKey]?.[domain]?.length ?? 0;
  const limit = storage[limitsByDomainKey]?.[domain] ?? defaultLimit;

  if (limitDate && limitUsed && limitDate === new Date().toDateString()) {
    document.querySelector('.total-span').textContent = limitUsed;
  }
  if (limit) {
    document.querySelector('.limit-span').textContent = limit;
  }
});
