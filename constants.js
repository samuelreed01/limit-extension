export const defaultLimit = 5;
export const limitedDomainsKey = 'limited-domains';
export const limitsByDomainKey = 'limits-by-domain';
export const usageByDomainKey = 'usage-by-domain';
export const limitDateKey = 'limit-date';
export const blockSubredditsKey = 'block-subreddits';
export const blockAllRedditKey = 'block-all-reddit';
export const enableLockKey = 'enable-lock';
export const showOverlayKey = 'show-overlay';

/** @param {string} domain */
export function formatDomain(domain) {
  let formatted = domain.replace('www.', '').replace('https://', '').replace('http://', '');
  if (formatted.endsWith('/')) formatted = formatted.slice(0, -1);
  return formatted;
}

const words = [
  'llama',
  'racoon',
  'crocodile',
  'tiger',
  'anaconda',
  'heron',
  'cobra',
  'hyrax',
  'giraffe',
  'elephant',
  'hippo',
  'rhinoceros',
];
export function getRandomWords(number = 4) {
  return Array.from({ length: number }, () => words[Math.floor(Math.random() * words.length)]).join(' ');
}
