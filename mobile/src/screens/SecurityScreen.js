import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Button, ErrorText, Field } from '../ui';
import { BackHeader } from '../components';
import { colors } from '../theme';
import { logoutAll, securityStatus, setPin } from '../api';

export default function SecurityScreen({ onBack, onLogout }) {
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

  const digits = (setter) => (t) => setter(t.replace(/\D/g, ''));

  async function save() {
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
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function logoutEverywhere() {
    try {
      await logoutAll();
    } catch {}
    onLogout();
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <BackHeader title="Payment PIN" onBack={onBack} />
      <Text style={{ color: colors.muted, fontSize: 13, marginBottom: 16 }}>
        {hasPin
          ? 'Change your 6-digit payment PIN.'
          : 'You need a 6-digit PIN to confirm every payment. After 5 wrong tries it locks for 15 minutes.'}
      </Text>

      {hasPin === false ? (
        <Field label="Your account password (to confirm it is you)" value={password} onChangeText={setPassword} secureTextEntry />
      ) : null}
      {hasPin ? (
        <Field label="Current PIN" value={currentPin} onChangeText={digits(setCurrentPin)} secureTextEntry keyboardType="number-pad" maxLength={6} />
      ) : null}
      <Field label="New PIN (6 digits)" value={newPin} onChangeText={digits(setNewPin)} secureTextEntry keyboardType="number-pad" maxLength={6} />
      <Field label="Repeat new PIN" value={confirmPin} onChangeText={digits(setConfirmPin)} secureTextEntry keyboardType="number-pad" maxLength={6} />

      <ErrorText>{error}</ErrorText>
      {ok ? <Text style={{ color: colors.green, fontWeight: '600', marginBottom: 12 }}>{ok}</Text> : null}
      <Button title="Save PIN" onPress={save} loading={busy} disabled={hasPin === null} />

      <View style={{ height: 1, backgroundColor: '#E5E7EB', marginVertical: 24 }} />
      <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: 6 }}>Lost a device?</Text>
      <Text style={{ color: colors.muted, fontSize: 13, marginBottom: 12 }}>
        This logs you out everywhere, on every phone and browser.
      </Text>
      <Button title="Log out on all devices" onPress={logoutEverywhere} outline color={colors.red} />
    </ScrollView>
  );
}
