'use client';

import { useCallback, useEffect, useState } from 'react';
import Shell from '../../components/Shell';
import { createMerchant, merchantSales, myMerchants } from '../../lib/api';
import { formatDate, formatKr } from '../../lib/format';

export default function BusinessPage() {
  return (
    <Shell>
      <Business />
    </Shell>
  );
}

function Business() {
  const [mine, setMine] = useState(null);
  const [selected, setSelected] = useState(null);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [category, setCategory] = useState('food');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const loadMine = useCallback(async () => {
    try {
      const list = await myMerchants();
      setMine(list);
      setSelected((cur) => cur || list[0]?.id || null);
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    loadMine();
  }, [loadMine]);

  useEffect(() => {
    if (!selected) return;
    setData(null);
    merchantSales(selected)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [selected]);

  async function create(e) {
    e.preventDefault();
    setCreateError('');
    setCreating(true);
    try {
      const m = await createMerchant({ name, category });
      setName('');
      setSelected(m.id);
      await loadMine();
    } catch (err) {
      setCreateError(err.message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <>
      <h1>My business</h1>
      {error && <p className="error">{error}</p>}
      {!mine && !error && <p className="muted">Loading...</p>}

      {mine && mine.length > 0 && (
        <>
          <div className="tabs">
            {mine.map((m) => (
              <button
                key={m.id}
                className={m.id === selected ? 'tab active' : 'tab'}
                onClick={() => setSelected(m.id)}
              >
                {m.name}
              </button>
            ))}
          </div>

          {!data ? (
            <p className="muted">Loading sales...</p>
          ) : (
            <>
              <div className="stats">
                <div className="card stat">
                  <span>Total sales</span>
                  <strong>{formatKr(data.summary.total_ore)}</strong>
                </div>
                <div className="card stat">
                  <span>Today (UTC)</span>
                  <strong>{formatKr(data.summary.today_ore)}</strong>
                </div>
                <div className="card stat">
                  <span>Number of sales</span>
                  <strong>{data.summary.sales_count}</strong>
                </div>
              </div>

              <div className="card">
                <h2>Latest sales</h2>
                {data.sales.length === 0 ? (
                  <p className="muted">No sales yet. Ask a customer to pay you from "Pay a business".</p>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>Customer</th>
                        <th>Date (UTC)</th>
                        <th>Note</th>
                        <th className="right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.sales.map((s) => (
                        <tr key={s.id}>
                          <td>{s.customer || '-'}</td>
                          <td>{formatDate(s.created_at)}</td>
                          <td>{s.note || ''}</td>
                          <td className="pos right">+{formatKr(s.amount_ore)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </>
      )}

      <form className="card narrow" onSubmit={create}>
        <h2>{mine && mine.length > 0 ? 'Register another business' : 'Register your business'}</h2>
        <label>Business name</label>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
        <label>Category</label>
        <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="food">Food</option>
          <option value="hotels">Hotels</option>
          <option value="cinema">Cinema</option>
          <option value="shop">Shop</option>
        </select>
        {createError && <p className="error">{createError}</p>}
        <button className="btn" disabled={creating}>
          {creating ? 'Creating...' : 'Register business'}
        </button>
      </form>
    </>
  );
}
