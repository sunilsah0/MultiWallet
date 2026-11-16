'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Shell from '../../components/Shell';
import { logoutAll, securityStatus, setPin } from '../../lib/api';
import { useAuth } from '../../lib/auth';

export default function SecurityPage() {
  return (
    <Shell>
      <Security />
    </Shell>
  );
}

function Security() {
  const { signOut } = useAuth();
  const router = useRouter();
  const [hasPin, setHasPin] = useState(null);
  const [password, setPassword] = useState('');
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    securityStatus()
      .then((s) => setHasPin(s.has_pin))
      .catch((e) => setError(e.message));
  }, []);

  const digits = (setter) => (e) => setter(e.target.value.replace(/\D/g, ''));

  async function save(e) {
    e.preventDefault();
    setError('');
    setOk('');
    if (!/^\d{6}$/.test(newPin)) return setError('PIN must be exactly 6 digits');
    if (newPin !== confirmPin) return setError('The two PINs do not match');
    setBusy(true);
    try {
      await setPin(hasPin ? { pin: newPin, current_pin: currentPin } : { pin: newPin, password });
      setOk('Payment PIN saved');
      setHasPin(true);
      setPassword('');
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function logoutEverywhere() {
    if (!window.confirm('Log out on ALL devices, including this one?')) return;
    try {
      await logoutAll();
    } catch {}
    signOut();
    router.replace('/login');
  }

  return (
    <>
      <h1>Security</h1>
      <form className="card narrow" onSubmit={save}>
        <h2>{hasPin ? 'Change payment PIN' : 'Set your payment PIN'}</h2>
        <p className="muted small">
          You need this 6-digit PIN to confirm every payment. After 5 wrong tries it locks for 15 minutes.
        </p>
        {hasPin === false && (
          <>
            <label>Your account password (to confirm it is you)</label>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </>
        )}
        {hasPin && (
          <>
            <label>Current PIN</label>
            <input className="input" type="password" inputMode="numeric" maxLength={6} value={currentPin} onChange={digits(setCurrentPin)} required />
          </>
        )}
        <label>New PIN (6 digits)</label>
        <input className="input" type="password" inputMode="numeric" maxLength={6} value={newPin} onChange={digits(setNewPin)} required />
        <label>Repeat new PIN</label>
        <input className="input" type="password" inputMode="numeric" maxLength={6} value={confirmPin} onChange={digits(setConfirmPin)} required />
        {error && <p className="error">{error}</p>}
        {ok && <p className="ok">{ok}</p>}
        <button className="btn" disabled={busy || hasPin === null}>
          {busy ? 'Saving...' : 'Save PIN'}
        </button>
      </form>

      <div className="card narrow">
        <h2>Lost a device?</h2>
        <p className="muted small">This makes every login on every phone and browser stop working. You can log in again afterwards.</p>
        <button className="btn btn-outline" onClick={logoutEverywhere} style={{ color: 'var(--red)', borderColor: 'var(--red)' }}>
          Log out on all devices
        </button>
      </div>
    </>
  );
}
