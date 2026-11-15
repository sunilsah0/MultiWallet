'use client';

import Link from 'next/link';
import Shell from '../../components/Shell';

const CATEGORIES = [
  ['hotels', 'Hotels', 'Book rooms', '#2563eb'],
  ['cinema', 'Cinema', 'Tickets and snacks', '#9333ea'],
  ['shop', 'Shop', 'Online stores', '#ea580c'],
  ['food', 'Food', 'Order from restaurants', '#dc2626'],
];

export default function ServicesPage() {
  return (
    <Shell>
      <h1>Services</h1>
      <p className="muted">Everything you can pay for with MultiWallet.</p>
      <div className="grid">
        {CATEGORIES.map(([key, name, desc, color]) => (
          <Link key={key} href={`/services/${key}`} className="card service-card">
            <span className="service-icon" style={{ background: color }} />
            <h2>{name}</h2>
            <span className="muted small">{desc}</span>
          </Link>
        ))}
      </div>
    </Shell>
  );
}
