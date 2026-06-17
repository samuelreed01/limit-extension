export const defaultLimit = 5;
export const limitedDomainsKey = 'limited-domains';
export const limitsByDomainKey = 'limits-by-domain';
export const usageByDomainKey = 'usage-by-domain';
export const limitDateKey = 'limit-date';

/** @param {string} domain */
export function formatDomain(domain) {
  let formatted = domain.replace('www.', '').replace('https://', '').replace('http://', '');
  if (formatted.endsWith('/')) formatted = formatted.slice(0, -1);
  return formatted;
}
