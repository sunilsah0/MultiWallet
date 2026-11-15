'use client';

import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { krToOre } from '../lib/format';

// A QR code that opens the pay screen in the MultiWallet app.
// It holds only the public business id (and an optional amount), never any secret.
export default function QrCard({ merchantId, name }) {
  const [amount, setAmount] = useState('');
  const ore = amount.trim() ? krToOre(amount) : null;
  const badAmount = amount.trim() && !ore;
  const code = `multiwallet://pay/merchant/${merchantId}${ore ? `?amount=${ore}` : ''}`;

  return (
    <div className="card qr-card">
      <h2>Payment QR code for {name}</h2>
      <div className="qr-box">
        <QRCodeSVG value={code} size={200} />
      </div>
      <p className="small muted">
        Customers scan this in the MultiWallet app. They always see your business name before they pay.
      </p>
      <label>Fixed amount in kr (optional, e.g. for one bill)</label>
      <input className="input" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="leave empty: customer types the amount" />
      {badAmount && <p className="error">Enter a number like 129</p>}
      <p className="small muted" style={{ marginBottom: 0 }}>Code text (you can paste it into the app's Scan screen while testing):</p>
      <p className="code-text">{code}</p>
      <button className="btn btn-outline btn-small" onClick={() => window.print()}>
        Print
      </button>
    </div>
  );
}
