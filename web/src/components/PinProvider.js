'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { setPinAsker } from '../lib/api';

// Shows the "Enter your payment PIN" box whenever the API layer needs a PIN.
export default function PinProvider({ children }) {
  const [open, setOpen] = useState(false);
  const [pin, setPin] = useState('');
  const resolver = useRef(null);

  const ask = useCallback(
    () =>
      new Promise((resolve) => {
        resolver.current = resolve;
        setPin('');
        setOpen(true);
      }),
    []
  );

  useEffect(() => {
    setPinAsker(ask);
    return () => setPinAsker(null);
  }, [ask]);

  function finish(value) {
    setOpen(false);
    const r = resolver.current;
    resolver.current = null;
    if (r) r(value);
  }

  return (
    <>
      {children}
      {open && (
        <div className="modal-backdrop">
          <form
            className="card modal"
            onSubmit={(e) => {
              e.preventDefault();
              if (pin.length === 6) finish(pin);
            }}
          >
            <h2 className="center">Enter your payment PIN</h2>
            <input
              className="input"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              maxLength={6}
              autoFocus
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            />
            <button className="btn btn-green" disabled={pin.length !== 6}>
              Confirm
            </button>
            <button type="button" className="btn btn-outline" onClick={() => finish(null)}>
              Cancel
            </button>
          </form>
        </div>
      )}
    </>
  );
}
