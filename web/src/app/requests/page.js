'use client';

import { useCallback, useEffect, useState } from 'react';
import Shell from '../../components/Shell';
import {
  cancelRequest,
  createRequest,
  declineRequest,
  incomingRequests,
  outgoingRequests,
  payRequest,
} from '../../lib/api';
import { formatDate, formatKr, krToOre } from '../../lib/format';

export default function RequestsPage() {
  return (
    <Shell>
      <Requests />
    </Shell>
  );
}

function Requests() {
  const [incoming, setIncoming] = useState(null);
  const [outgoing, setOutgoing] = useState(null);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const [phone, setPhone] = useState('+46');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    try {
      const [i, o] = await Promise.all([incomingRequests(), outgoingRequests()]);
      setIncoming(i);
      setOutgoing(o);
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function create(e) {
    e.preventDefault();
    setError('');
    setInfo('');
    const ore = krToOre(amount);
    if (!ore) return setError('Enter an amount, e.g. 75');
    setSending(true);
    try {
      await createRequest({ from_phone: phone, amount_ore: ore, note: note.trim() || undefined });
      setInfo(`Request for ${formatKr(ore)} sent to ${phone}`);
      setAmount('');
      setNote('');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  async function act(fn, id, confirmText) {
    if (confirmText && !window.confirm(confirmText)) return;
    setError('');
    setInfo('');
    try {
      await fn(id);
      await load();
    } catch (err) {
      setError(err.message);
      await load();
    }
  }

  return (
    <>
      <h1>Requests</h1>
      {error && <p className="error">{error}</p>}
      {info && <p className="ok">{info}</p>}

      <div className="card">
        <h2>Requests for you</h2>
        {!incoming ? (
          <p className="muted">Loading...</p>
        ) : incoming.length === 0 ? (
          <p className="muted">Nobody is asking you to pay right now.</p>
        ) : (
          <table>
            <tbody>
              {incoming.map((r) => (
                <tr key={r.id}>
                  <td>
                    <strong>{r.requester_name}</strong> asks for <strong>{formatKr(r.amount_ore)}</strong>
                    <br />
                    <span className="muted small">
                      {formatDate(r.created_at)}
                      {r.note ? ` · ${r.note}` : ''}
                    </span>
                  </td>
                  <td className="right">
                    <div className="row-actions" style={{ justifyContent: 'flex-end' }}>
                      <button
                        className="btn btn-small btn-green"
                        onClick={() => act(payRequest, r.id, `Pay ${formatKr(r.amount_ore)} to ${r.requester_name}?`)}
                      >
                        Pay
                      </button>
                      <button className="btn btn-small btn-outline" onClick={() => act(declineRequest, r.id)}>
                        Decline
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="two-col">
        <form className="card" onSubmit={create}>
          <h2>Request money</h2>
          <label>From (phone number)</label>
          <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} required />
          <label>Amount (kr)</label>
          <input className="input" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="75" required />
          <label>What is it for? (optional)</label>
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={140} />
          <button className="btn" disabled={sending}>
            {sending ? 'Sending...' : 'Send request'}
          </button>
        </form>

        <div className="card">
          <h2>Your requests</h2>
          {!outgoing ? (
            <p className="muted">Loading...</p>
          ) : outgoing.length === 0 ? (
            <p className="muted">You have not asked anyone yet.</p>
          ) : (
            <table>
              <tbody>
                {outgoing.map((r) => (
                  <tr key={r.id}>
                    <td>
                      {formatKr(r.amount_ore)} from <strong>{r.payer_name}</strong>
                      <br />
                      <span className="muted small">
                        {formatDate(r.created_at)}
                        {r.note ? ` · ${r.note}` : ''}
                      </span>
                    </td>
                    <td className="right">
                      <span className={`status status-${r.status === 'paid' ? 'completed' : r.status}`}>{r.status}</span>
                      {r.status === 'pending' && (
                        <>
                          <br />
                          <button className="link-button" onClick={() => act(cancelRequest, r.id, 'Cancel this request?')}>
                            Cancel
                          </button>
                        </>
                      )}
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
