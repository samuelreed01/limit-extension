import { defaultLimit, formatDomain, limitDateKey, limitsByDomainKey, usageByDomainKey } from '../constants.js';

window.addEventListener('load', async () => {
  const generalData = document.getElementById('general-data');
  const siteSpecificData = document.getElementById('site-specific-data');

  const settingsButton = document.getElementById('settings-button');
  if (settingsButton) {
    settingsButton.addEventListener('click', () => {
      browser.runtime.openOptionsPage();
    });
  }

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

  const storage = await browser.storage.local.get();
  const limitDate = storage[limitDateKey];
  const limitUsed = storage[usageByDomainKey]?.[domain]?.length ?? 0;
  const limit = storage[limitsByDomainKey]?.[domain] ?? defaultLimit;

  if (limit && generalData && siteSpecificData) {
    generalData.style.display = 'none';
    siteSpecificData.style.display = 'block';
  }

  const totalSpan = document.querySelector('.total-span');
  const limitSpan = document.querySelector('.limit-span');

  if (totalSpan && limitDate && limitUsed && limitDate === new Date().toDateString()) {
    totalSpan.textContent = limitUsed;
  }
  if (limitSpan && limit) {
    limitSpan.textContent = limit;
  }
});
