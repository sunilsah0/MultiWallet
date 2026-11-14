'use client';

import { useEffect, useRef, useState } from 'react';
import Shell from '../../components/Shell';
import { listMerchants, newKey, payMerchant } from '../../lib/api';
import { formatKr, krToOre } from '../../lib/format';

export default function MerchantsPage() {
  return (
    <Shell>
      <Merchants />
    </Shell>
  );
}

function Merchants() {
  const [merchants, setMerchants] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    listMerchants()
      .then(setMerchants)
      .catch((e) => setError(e.message));
  }, []);

  return (
    <>
      <h1>Pay a business</h1>
      <p className="muted">
        Hotels, cinemas, shops and restaurants that accept MultiWallet. (Full ordering with menus comes in Phase 7.)
      </p>
      {error && <p className="error">{error}</p>}
      {!merchants && !error && <p className="muted">Loading...</p>}
      {merchants && merchants.length === 0 && <p className="muted">No businesses yet. Register one under "My business".</p>}
      <div className="grid">
        {merchants?.map((m) => (
          <MerchantCard key={m.id} m={m} />
        ))}
      </div>
    </>
  );
}

function MerchantCard({ m }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [loading, setLoading] = useState(false);
  const keyRef = useRef(newKey());

  async function pay(e) {
    e.preventDefault();
    setError('');
    setOk('');
    const ore = krToOre(amount);
    if (!ore) return setError('Enter an amount, e.g. 129');
    if (!window.confirm(`Pay ${formatKr(ore)} to ${m.name}?`)) return;

    setLoading(true);
    try {
      await payMerchant(m.id, { amount_ore: ore, note: note.trim() || undefined }, keyRef.current);
      setOk(`Paid ${formatKr(ore)} to ${m.name}`);
      keyRef.current = newKey();
      setAmount('');
      setNote('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <span className={`badge badge-${m.category}`}>{m.category}</span>
      <h2>{m.name}</h2>
      {!open ? (
        <button className="btn" onClick={() => setOpen(true)}>Pay</button>
      ) : (
        <form onSubmit={pay}>
          <label>Amount (kr)</label>
          <input className="input" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="129" required />
          <label>Note (optional)</label>
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={140} />
          {error && <p className="error">{error}</p>}
          <button className="btn btn-green" disabled={loading}>
            {loading ? 'Paying...' : 'Pay now'}
          </button>
        </form>
      )}
      {ok && <p className="ok">{ok}</p>}
    </div>
  );
}
