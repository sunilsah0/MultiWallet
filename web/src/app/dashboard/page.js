'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Shell from '../../components/Shell';
import { getHistory, getWallet, newKey, sendMoney, topup } from '../../lib/api';
import { formatDate, formatKr, krToOre } from '../../lib/format';

export default function DashboardPage() {
  return (
    <Shell>
      <Dashboard />
    </Shell>
  );
}

function Dashboard() {
  const [wallet, setWallet] = useState(null);
  const [history, setHistory] = useState([]);
  const [loadError, setLoadError] = useState('');

  const [phone, setPhone] = useState('+46');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [sendOk, setSendOk] = useState('');
  const [topupBusy, setTopupBusy] = useState(false);
  const keyRef = useRef(newKey()); // one key per payment attempt

  const load = useCallback(async () => {
    try {
      const [w, h] = await Promise.all([getWallet(), getHistory()]);
      setWallet(w);
      setHistory(h);
      setLoadError('');
    } catch (e) {
      setLoadError(e.message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function addTestMoney() {
    setTopupBusy(true);
    try {
      await topup(50000, newKey()); // 500 kr
      await load();
    } catch (e) {
      setLoadError(e.message);
    } finally {
      setTopupBusy(false);
    }
  }

  async function submitSend(e) {
    e.preventDefault();
    setSendError('');
    setSendOk('');
    const ore = krToOre(amount);
    if (!ore) return setSendError('Enter an amount, e.g. 200');
    if (!window.confirm(`Pay ${formatKr(ore)} to ${phone}?`)) return;

    setSending(true);
    try {
      await sendMoney({ to_phone: phone, amount_ore: ore, note: note.trim() || undefined }, keyRef.current);
      setSendOk(`Sent ${formatKr(ore)} to ${phone}`);
      keyRef.current = newKey(); // next payment gets a new key
      setAmount('');
      setNote('');
      await load();
    } catch (err) {
      setSendError(err.message);
    } finally {
      setSending(false);
    }
  }

  if (!wallet) {
    return loadError ? <p className="error">{loadError}</p> : <p className="muted">Loading wallet...</p>;
  }

  return (
    <>
      <h1>Hi, {wallet.full_name.split(' ')[0]}</h1>
      {loadError && <p className="error">{loadError}</p>}

      <div className="two-col">
        <div>
          <div className="card balance">
            <span>Balance</span>
            <strong>{formatKr(wallet.balance_ore)}</strong>
            <small>{wallet.phone}</small>
          </div>
          <button className="btn btn-outline btn-green-outline" onClick={addTestMoney} disabled={topupBusy}>
            {topupBusy ? 'Adding...' : 'TEST: add 500 kr test money'}
          </button>

          <form className="card" onSubmit={submitSend}>
            <h2>Send money</h2>
            <label>To (phone number)</label>
            <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} required />
            <label>Amount (kr)</label>
            <input className="input" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="200" required />
            <label>Message (optional)</label>
            <input className="input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={140} />
            {sendError && <p className="error">{sendError}</p>}
            {sendOk && <p className="ok">{sendOk}</p>}
            <button className="btn" disabled={sending}>
              {sending ? 'Sending...' : 'Send'}
            </button>
          </form>
        </div>

        <div className="card">
          <h2>History</h2>
          {history.length === 0 ? (
            <p className="muted">No payments yet.</p>
          ) : (
            <table>
              <tbody>
                {history.map((tx) => (
                  <tr key={tx.id}>
                    <td>
                      <strong>{tx.counterparty || 'MultiWallet'}</strong>
                      <br />
                      <span className="muted small">
                        {formatDate(tx.created_at)}
                        {tx.note ? ` · ${tx.note}` : ''}
                      </span>
                    </td>
                    <td className={tx.amount_ore > 0 ? 'pos right' : 'neg right'}>
                      {tx.amount_ore > 0 ? '+' : ''}
                      {formatKr(tx.amount_ore)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
