'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import Shell from '../../../components/Shell';
import { getCategory } from '../../../lib/api';
import { formatKr } from '../../../lib/format';

export default function CategoryPage() {
  return (
    <Shell>
      <Category />
    </Shell>
  );
}

function Category() {
  const { category } = useParams();
  const [list, setList] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setList(null);
    getCategory(category)
      .then(setList)
      .catch((e) => setError(e.message));
  }, [category]);

  return (
    <>
      <p>
        <Link href="/services">← Services</Link>
      </p>
      <h1 style={{ textTransform: 'capitalize' }}>{category}</h1>
      {error && <p className="error">{error}</p>}
      {!list && !error && <p className="muted">Loading...</p>}
      {list && list.length === 0 && <p className="muted">No businesses here yet.</p>}
      <div className="grid">
        {list?.map((m) => (
          <Link key={m.id} href={`/store/${m.id}`} className="card service-card">
            <span className={`badge badge-${m.category}`}>{m.category}</span>
            <h2>{m.name}</h2>
            <span className="muted small">
              {m.product_count} item{m.product_count === 1 ? '' : 's'}
              {m.from_price_ore !== null ? ` · from ${formatKr(m.from_price_ore)}` : ''}
            </span>
          </Link>
        ))}
      </div>
    </>
  );
}
