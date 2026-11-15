// The text inside a MultiWallet QR code:
//   multiwallet://pay/merchant/<business id>            (amount typed by the customer)
//   multiwallet://pay/merchant/<business id>?amount=12900   (12900 öre = 129 kr)
//   multiwallet://pay/user/<url-encoded phone number>
export function parseCode(text) {
  const m = /^multiwallet:\/\/pay\/(merchant|user)\/([^?]+)(?:\?(.*))?$/.exec(String(text).trim());
  if (!m) return null;

  let id;
  try {
    id = decodeURIComponent(m[2]);
  } catch {
    return null;
  }

  let amountOre = null;
  if (m[3]) {
    const a = /(?:^|&)amount=(\d+)(?:&|$)/.exec(m[3]);
    if (a && Number(a[1]) > 0) amountOre = Number(a[1]);
  }
  return { kind: m[1], id, amountOre };
}

export const userCode = (phone) => `multiwallet://pay/user/${encodeURIComponent(phone)}`;
