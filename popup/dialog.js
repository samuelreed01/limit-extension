window.addEventListener('load', () => {
  const updateButton = document.getElementById('update-button');
  if (updateButton) {
    updateButton.addEventListener('click', () => {
      const limit = document.getElementById('limit-input').value;
      browser.storage.local.set({ 'yt-limit': limit });
    });
  }

  browser.storage.local.get().then(result => {
    const limitDate = result['yt-limit-date'];
    const limitUsed = result['yt-limit-used'];
    const limit = result['yt-limit'];

    if (limitDate && limitUsed && limitDate === new Date().toDateString()) {
      document.querySelector('.total-span').textContent = limitUsed;
    }
    if (limit) {
      document.querySelector('.limit-span').textContent = limit;
      document.getElementById('limit-input').value = limit;
    }
  });
});
