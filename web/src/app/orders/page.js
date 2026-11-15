'use client';

import { useEffect, useState } from 'react';
import Shell from '../../components/Shell';
import { myOrders } from '../../lib/api';
import { formatDate, formatKr } from '../../lib/format';

export default function OrdersPage() {
  return (
    <Shell>
      <Orders />
    </Shell>
  );
}

function Orders() {
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    myOrders()
      .then(setOrders)
      .catch((e) => setError(e.message));
  }, []);

  return (
    <>
      <h1>My orders</h1>
      {error && <p className="error">{error}</p>}
      {!orders && !error && <p className="muted">Loading...</p>}
      {orders && orders.length === 0 && <p className="muted">No orders yet. Try Services.</p>}
      {orders?.map((o) => (
        <div key={o.id} className="card">
          <div className="order-head">
            <div>
              <span className={`badge badge-${o.category}`}>{o.category}</span>
              <h2 style={{ marginBottom: 4 }}>{o.merchant_name}</h2>
              <span className="muted small">
                {formatDate(o.created_at)} · order {o.id.slice(0, 8)}
              </span>
            </div>
            <span className={`status status-${o.status}`}>{o.status}</span>
          </div>
          <table>
            <tbody>
              {o.items.map((i, n) => (
                <tr key={n}>
                  <td>
                    {i.quantity} × {i.name}
                  </td>
                  <td className="right">{formatKr(i.unit_price_ore * i.quantity)}</td>
                </tr>
              ))}
              <tr>
                <td>
                  <strong>Total</strong>
                </td>
                <td className="right">
                  <strong>{formatKr(o.total_ore)}</strong>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      ))}
    </>
  );
}
