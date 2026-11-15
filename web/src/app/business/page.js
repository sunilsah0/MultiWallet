'use client';

import { useCallback, useEffect, useState } from 'react';
import Shell from '../../components/Shell';
import QrCard from '../../components/QrCard';
import {
  addProduct,
  businessOrders,
  completeOrder,
  createMerchant,
  getStore,
  merchantSales,
  myMerchants,
  removeProduct,
} from '../../lib/api';
import { formatDate, formatKr, krToOre } from '../../lib/format';

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
              <button key={m.id} className={m.id === selected ? 'tab active' : 'tab'} onClick={() => setSelected(m.id)}>
                {m.name}
              </button>
            ))}
          </div>
          {selected && <BusinessDetails key={selected} merchantId={selected} />}
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

function BusinessDetails({ merchantId }) {
  const [sales, setSales] = useState(null);
  const [orders, setOrders] = useState(null);
  const [products, setProducts] = useState(null);
  const [error, setError] = useState('');

  const [pName, setPName] = useState('');
  const [pDesc, setPDesc] = useState('');
  const [pPrice, setPPrice] = useState('');
  const [pUnit, setPUnit] = useState('');
  const [pError, setPError] = useState('');
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    try {
      const [s, o, st] = await Promise.all([
        merchantSales(merchantId),
        businessOrders(merchantId),
        getStore(merchantId),
      ]);
      setSales(s);
      setOrders(o);
      setProducts(st.products);
      setError('');
    } catch (e) {
      setError(e.message);
    }
  }, [merchantId]);

  useEffect(() => {
    load();
  }, [load]);

  async function markCompleted(orderId) {
    try {
      await completeOrder(orderId);
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function add(e) {
    e.preventDefault();
    setPError('');
    const ore = krToOre(pPrice);
    if (!ore) return setPError('Enter a price in kr, e.g. 129');
    setAdding(true);
    try {
      await addProduct(merchantId, {
        name: pName,
        description: pDesc.trim() || undefined,
        price_ore: ore,
        unit: pUnit.trim() || undefined,
      });
      setPName('');
      setPDesc('');
      setPPrice('');
      setPUnit('');
      await load();
    } catch (err) {
      setPError(err.message);
    } finally {
      setAdding(false);
    }
  }

  async function remove(productId) {
    if (!window.confirm('Remove this product from your menu?')) return;
    try {
      await removeProduct(productId);
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  if (error) return <p className="error">{error}</p>;
  if (!sales || !orders || !products) return <p className="muted">Loading...</p>;

  return (
    <>
      <div className="stats">
        <div className="card stat">
          <span>Total sales</span>
          <strong>{formatKr(sales.summary.total_ore)}</strong>
        </div>
        <div className="card stat">
          <span>Today (UTC)</span>
          <strong>{formatKr(sales.summary.today_ore)}</strong>
        </div>
        <div className="card stat">
          <span>Number of sales</span>
          <strong>{sales.summary.sales_count}</strong>
        </div>
      </div>

      <QrCard merchantId={merchantId} name={sales.merchant.name} />

      <div className="card">
        <h2>Orders</h2>
        {orders.length === 0 ? (
          <p className="muted">No orders yet. Customers order from Services.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Items</th>
                <th className="right">Total</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>
                    {o.id.slice(0, 8)}
                    <br />
                    <span className="muted small">{formatDate(o.created_at)}</span>
                  </td>
                  <td>{o.customer}</td>
                  <td>{o.items.map((i) => `${i.quantity} × ${i.name}`).join(', ')}</td>
                  <td className="pos right">{formatKr(o.total_ore)}</td>
                  <td>
                    <span className={`status status-${o.status}`}>{o.status}</span>
                  </td>
                  <td>
                    {o.status === 'paid' && (
                      <button className="btn btn-small btn-green" style={{ margin: 0 }} onClick={() => markCompleted(o.id)}>
                        Mark completed
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="two-col">
        <div className="card">
          <h2>Menu / products</h2>
          {products.length === 0 ? (
            <p className="muted">No products yet. Add your first one.</p>
          ) : (
            <table>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <strong>{p.name}</strong>
                      {p.description && (
                        <>
                          <br />
                          <span className="muted small">{p.description}</span>
                        </>
                      )}
                    </td>
                    <td className="right">
                      {formatKr(p.price_ore)}
                      {p.unit && (
                        <>
                          <br />
                          <span className="muted small">{p.unit}</span>
                        </>
                      )}
                    </td>
                    <td className="right">
                      <button className="link-button" onClick={() => remove(p.id)}>
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <form className="card" onSubmit={add}>
          <h2>Add a product</h2>
          <label>Name</label>
          <input className="input" value={pName} onChange={(e) => setPName(e.target.value)} required />
          <label>Description (optional)</label>
          <input className="input" value={pDesc} onChange={(e) => setPDesc(e.target.value)} />
          <label>Price (kr)</label>
          <input className="input" value={pPrice} onChange={(e) => setPPrice(e.target.value)} placeholder="59" required />
          <label>Unit (optional, e.g. per night, per ticket)</label>
          <input className="input" value={pUnit} onChange={(e) => setPUnit(e.target.value)} />
          {pError && <p className="error">{pError}</p>}
          <button className="btn" disabled={adding}>
            {adding ? 'Adding...' : 'Add product'}
          </button>
        </form>
      </div>
    </>
  );
}
