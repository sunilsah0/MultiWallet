'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { login, register } from '../../lib/api';
import { useAuth } from '../../lib/auth';

export default function LoginPage() {
  const { token, ready, signIn } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState('login'); // login | register
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+46');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (ready && token) router.replace('/dashboard');
  }, [ready, token, router]);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data =
        mode === 'login'
          ? await login({ email, password })
          : await register({ full_name: fullName, email, phone, password });
      signIn(data.token);
      router.replace('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-hero">
        <div className="logo">M</div>
        <h1>MultiWallet</h1>
        <p>Pay. Book. Order. One app.</p>
      </div>

      <form className="card auth-card" onSubmit={submit}>
        <h2>{mode === 'login' ? 'Log in' : 'Create account'}</h2>

        {mode === 'register' && (
          <>
            <label>Full name</label>
            <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            <label>Phone number</label>
            <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} required />
          </>
        )}

        <label>Email</label>
        <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <label>Password (min 8 characters)</label>
        <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />

        {error && <p className="error">{error}</p>}
        <button className="btn" disabled={loading}>
          {loading ? 'Please wait...' : mode === 'login' ? 'Log in' : 'Create account'}
        </button>

        <p className="center">
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setError('');
              setMode(mode === 'login' ? 'register' : 'login');
            }}
          >
            {mode === 'login' ? 'New here? Create an account' : 'Have an account? Log in'}
          </a>
        </p>
        <p className="center muted small">Prototype: test money only</p>
      </form>
    </div>
  );
}
