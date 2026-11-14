// 12900 (öre) -> "129.00 kr"
export function formatKr(ore) {
  const sign = ore < 0 ? '-' : '';
  const abs = Math.abs(ore);
  const kr = Math.floor(abs / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const rest = String(abs % 100).padStart(2, '0');
  return `${sign}${kr}.${rest} kr`;
}

// "200" or "200,50" (kronor, typed by the user) -> 20050 (öre), or null if invalid.
// Math.round avoids floating point errors like 0.29 * 100 = 28.999999
export function krToOre(text) {
  const n = Number(String(text).trim().replace(',', '.'));
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100);
}

export function formatDate(iso) {
  return new Date(iso).toISOString().slice(0, 16).replace('T', ' ');
}
