import { defaultLimit, limitsByDomainKey, usageByDomainKey } from '../constants.js';

window.addEventListener('load', async () => {
  const addButton = document.getElementById('add-domain-button');
  if (addButton) {
    addButton.addEventListener('click', async () => {
      const domain = document.getElementById('domain-input')?.value || '';
      const limit = document.getElementById('limit-input')?.value || defaultLimit;
      const { [limitsByDomainKey]: currentLimits } = await browser.storage.local.get(limitsByDomainKey);

      let formattedDomain = domain.replace('www.', '').replace('https://', '').replace('http://', '');
      if (formattedDomain.endsWith('/')) formattedDomain = formattedDomain.slice(0, -1);

      await browser.storage.local.set({ [limitsByDomainKey]: { ...currentLimits, [formattedDomain]: Number(limit) } });

      buildTable();

      const domainInput = document.getElementById('domain-input');
      const limitInput = document.getElementById('limit-input');
      if (domainInput && domainInput instanceof HTMLInputElement) domainInput.value = '';
      if (limitInput && limitInput instanceof HTMLInputElement) limitInput.value = defaultLimit.toString();
    });
  }

  buildTable();
});

async function buildTable() {
  const storage = await browser.storage.local.get([limitsByDomainKey, usageByDomainKey]);
  const limitsByDomain = storage[limitsByDomainKey] || {};
  const usageByDomain = storage[usageByDomainKey] || {};

  const domainsTable = document.getElementById('domains-table');
  if (!domainsTable) return;
  domainsTable.innerHTML = '';

  Object.entries(limitsByDomain).forEach(([domain, limit]) => {
    const row = document.createElement('tr');
    const domainCell = document.createElement('td');
    domainCell.textContent = domain;
    const limitCell = document.createElement('td');
    limitCell.style.textAlign = 'center';
    limitCell.textContent = limit.toString();
    const usedCell = document.createElement('td');
    usedCell.style.textAlign = 'center';
    usedCell.textContent = usageByDomain[domain]?.length || 0;

    const removeCell = document.createElement('td');
    removeCell.classList.add('button-wrapper');
    const removeButton = document.createElement('button');
    removeButton.textContent = 'Remove';
    removeButton.addEventListener('click', async () => {
      const { [limitsByDomainKey]: currentLimits, [usageByDomainKey]: currentUsage } = await browser.storage.local.get({
        limitsByDomainKey,
        usageByDomainKey,
      });
      if (currentUsage[domain]?.length && currentUsage[domain].length === currentLimits[domain]) {
        // todo: show warning
        return;
      }
      const newLimits = { ...currentLimits };
      delete newLimits[domain];
      browser.storage.local.set({ [limitsByDomainKey]: newLimits });
      await buildTable();
    });

    const resetButton = document.createElement('button');
    resetButton.textContent = 'Reset';
    resetButton.addEventListener('click', async () => {
      const { [limitsByDomainKey]: currentLimits, [usageByDomainKey]: currentUsage } = await browser.storage.local.get({
        limitsByDomainKey,
        usageByDomainKey,
      });
      if (currentUsage[domain]?.length && currentUsage[domain].length === currentLimits[domain]) {
        // todo: show warning
        return;
      }
      const newUsage = { ...currentUsage };
      newUsage[domain] = [];
      browser.storage.local.set({ [usageByDomainKey]: newUsage });
      await buildTable();
    });

    removeCell.appendChild(removeButton);
    removeCell.appendChild(resetButton);

    row.appendChild(domainCell);
    row.appendChild(limitCell);
    row.appendChild(usedCell);
    row.appendChild(removeCell);
    domainsTable.appendChild(row);
  });
}
