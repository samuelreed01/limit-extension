import {
  blockAllRedditKey,
  blockSubredditsKey,
  defaultLimit,
  enableLockKey,
  getRandomWords,
  limitsByDomainKey,
  usageByDomainKey,
} from '../constants.js';

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

  const stored = await browser.storage.local.get();

  const blockRedditCheckbox = document.getElementById('block-all-reddit');
  const blockSubredditsCheckbox = document.getElementById('block-subreddits');
  if (
    blockRedditCheckbox &&
    blockRedditCheckbox instanceof HTMLInputElement &&
    blockSubredditsCheckbox &&
    blockSubredditsCheckbox instanceof HTMLInputElement
  ) {
    blockRedditCheckbox.checked = stored[blockAllRedditKey];
    blockRedditCheckbox.addEventListener('change', async () => {
      blockSubredditsCheckbox.checked = false;
      await browser.storage.local.set({
        [blockAllRedditKey]: blockRedditCheckbox.checked,
        [blockSubredditsKey]: false,
      });
    });

    blockSubredditsCheckbox.checked = stored[blockSubredditsKey];
    blockSubredditsCheckbox.addEventListener('change', async () => {
      blockRedditCheckbox.checked = false;
      await browser.storage.local.set({
        [blockSubredditsKey]: blockSubredditsCheckbox.checked,
        [blockAllRedditKey]: false,
      });
    });
  }

  const enableLockCheckbox = document.getElementById('enable-lock');
  if (enableLockCheckbox && enableLockCheckbox instanceof HTMLInputElement) {
    enableLockCheckbox.checked = stored[enableLockKey];
    enableLockCheckbox.addEventListener('change', async () => {
      if (!enableLockCheckbox.checked) {
        const passed = await completeChallenge();
        if (!passed) {
          enableLockCheckbox.checked = true;
          return;
        }
      }

      await browser.storage.local.set({ [enableLockKey]: enableLockCheckbox.checked });
    });
  }

  buildTable();
});

async function completeChallenge() {
  const dialog = document.getElementById('challenge-dialog');
  const input = document.getElementById('challenge-input');
  const display = document.getElementById('challenge-text');
  const button = document.getElementById('challenge-button');

  if (
    !dialog ||
    !input ||
    !display ||
    !button ||
    !(dialog instanceof HTMLDialogElement) ||
    !(input instanceof HTMLInputElement)
  ) {
    return false;
  }

  const challengeText = getRandomWords(4);
  display.innerText = challengeText;
  dialog.showModal();
  input.focus();

  return /** @type {Promise<boolean>} */ (
    new Promise(resolve => {
      const checkAndResolve = () => {
        if (input.value === challengeText) {
          dialog.onclose = () => {};
          resolve(true);
        } else {
          resolve(false);
        }
        input.value = '';
        dialog.close();
      };

      button.onclick = checkAndResolve;

      input.onkeydown = e => {
        if (e.key === 'Enter') checkAndResolve();
      };

      dialog.onclose = () => resolve(false);
    })
  );
}

async function buildTable() {
  const storage = await browser.storage.local.get([limitsByDomainKey, usageByDomainKey, enableLockKey]);
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
      const stored = await browser.storage.local.get([limitsByDomainKey, usageByDomainKey]);
      const currentUsage = stored[usageByDomainKey];
      const currentLimits = stored[limitsByDomainKey];
      if (currentUsage?.[domain]?.length && currentUsage[domain].length === currentLimits[domain]) {
        if (storage[enableLockKey]) {
          const passed = await completeChallenge();
          if (!passed) return;
        }
      }
      const newLimits = { ...currentLimits };
      delete newLimits[domain];
      browser.storage.local.set({ [limitsByDomainKey]: newLimits });
      await buildTable();
    });

    const resetButton = document.createElement('button');
    resetButton.textContent = 'Reset';
    resetButton.addEventListener('click', async () => {
      const stored = await browser.storage.local.get([limitsByDomainKey, usageByDomainKey]);
      const currentUsage = stored[usageByDomainKey];
      const currentLimits = stored[limitsByDomainKey];
      if (currentUsage?.[domain]?.length && currentUsage[domain].length === currentLimits[domain]) {
        if (storage[enableLockKey]) {
          const passed = await completeChallenge();
          if (!passed) return;
        }
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
