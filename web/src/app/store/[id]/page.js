'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import Shell from '../../../components/Shell';
import { createOrder, getStore, newKey } from '../../../lib/api';
import { formatKr } from '../../../lib/format';

export default function StorePage() {
  return (
    <Shell>
      <Store />
    </Shell>
  );
}

function Store() {
  const { id } = useParams();
  const [store, setStore] = useState(null);
  const [error, setError] = useState('');
  const [cart, setCart] = useState({}); // product id -> quantity
  const [note, setNote] = useState('');
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState('');
  const [done, setDone] = useState(null);
  const keyRef = useRef(newKey()); // one key per order attempt

  useEffect(() => {
    getStore(id)
      .then(setStore)
      .catch((e) => setError(e.message));
  }, [id]);

  // the cart as a list of lines (display only: the server recalculates the real price)
  const lines = useMemo(
    () => (store ? store.products.filter((p) => cart[p.id]).map((p) => ({ ...p, quantity: cart[p.id] })) : []),
    [store, cart]
  );
  const total = lines.reduce((sum, l) => sum + l.price_ore * l.quantity, 0);

  function change(productId, delta) {
    setCart((c) => {
      const q = Math.max(0, Math.min(20, (c[productId] || 0) + delta));
      const next = { ...c };
      if (q === 0) delete next[productId];
      else next[productId] = q;
      return next;
    });
  }

  async function pay() {
    if (lines.length === 0) return;
    if (!window.confirm(`Pay ${formatKr(total)} to ${store.merchant.name}?`)) return;
    setPaying(true);
    setPayError('');
    try {
      const result = await createOrder(
        {
          merchant_id: store.merchant.id,
          items: lines.map((l) => ({ product_id: l.id, quantity: l.quantity })),
          note: note.trim() || undefined,
        },
        keyRef.current
      );
      keyRef.current = newKey(); // the next order gets a new key
      setCart({});
      setNote('');
      setDone({ ...result, name: store.merchant.name });
    } catch (e) {
      setPayError(e.message);
    } finally {
      setPaying(false);
    }
  }

  if (error) return <p className="error">{error}</p>;
  if (!store) return <p className="muted">Loading...</p>;

  if (done) {
    return (
      <div className="card narrow center">
        <div className="big-check">✓</div>
        <h1>Order placed</h1>
        <p>
          You paid <strong>{formatKr(done.total_ore)}</strong> to {done.name}.
        </p>
        <p className="muted small">Order {done.order_id.slice(0, 8)}</p>
        <Link href="/orders" className="btn" style={{ textDecoration: 'none', lineHeight: '48px' }}>
          See my orders
        </Link>
        <button className="btn btn-outline" onClick={() => setDone(null)}>
          Order more
        </button>
      </div>
    );
  }

  return (
    <>
      <p>
        <Link href={`/services/${store.merchant.category}`}>← {store.merchant.category}</Link>
      </p>
      <h1>{store.merchant.name}</h1>

      <div className="two-col">
        <div>
          {store.products.length === 0 && <p className="muted">No items yet.</p>}
          {store.products.map((p) => (
            <div key={p.id} className="card item-row">
              <div>
                <strong>{p.name}</strong>
                {p.description && <div className="muted small">{p.description}</div>}
                <div>
                  {formatKr(p.price_ore)} {p.unit && <span className="muted small">{p.unit}</span>}
                </div>
              </div>
              <div className="qty">
                <button onClick={() => change(p.id, -1)} disabled={!cart[p.id]}>−</button>
                <span>{cart[p.id] || 0}</span>
                <button onClick={() => change(p.id, 1)}>+</button>
              </div>
            </div>
          ))}
        </div>

        <div className="card cart">
          <h2>Your cart</h2>
          {lines.length === 0 ? (
            <p className="muted">Add something from the menu.</p>
          ) : (
            <>
              <table>
                <tbody>
                  {lines.map((l) => (
                    <tr key={l.id}>
                      <td>
                        {l.quantity} × {l.name}
                      </td>
                      <td className="right">{formatKr(l.price_ore * l.quantity)}</td>
                    </tr>
                  ))}
                  <tr>
                    <td>
                      <strong>Total</strong>
                    </td>
                    <td className="right">
                      <strong>{formatKr(total)}</strong>
                    </td>
                  </tr>
                </tbody>
              </table>
              <label>Message to the business (optional)</label>
              <input className="input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={140} />
              {payError && <p className="error">{payError}</p>}
              <button className="btn btn-green" onClick={pay} disabled={paying}>
                {paying ? 'Paying...' : `Pay ${formatKr(total)} with wallet`}
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
