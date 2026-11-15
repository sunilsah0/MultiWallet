import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { Button, ErrorText, Field } from '../ui';
import { BackHeader } from '../components';
import { colors } from '../theme';
import { getStore, lookupUser, newKey, payMerchant, sendMoney } from '../api';
import { formatKr, krToOre } from '../format';

export default function PayScreen({ code, myPhone, onBack, onDone }) {
  const fixed = Boolean(code.amountOre); // the QR code already contains the amount
  const [info, setInfo] = useState(null); // { name, subtitle, isMe }
  const [loadError, setLoadError] = useState('');
  const [amount, setAmount] = useState(fixed ? (code.amountOre / 100).toFixed(2) : '');
  const [note, setNote] = useState('');
  const [step, setStep] = useState('form'); // form | confirm | done
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const keyRef = useRef(newKey()); // one key per payment attempt
  const ore = fixed ? code.amountOre : krToOre(amount);

  // Find out WHO we are about to pay, from the server (never trust the QR for names)
  useEffect(() => {
    if (code.kind === 'merchant') {
      getStore(code.id)
        .then((s) => setInfo({ name: s.merchant.name, subtitle: s.merchant.category, isMe: false }))
        .catch((e) => setLoadError(e.message));
    } else {
      lookupUser(code.id)
        .then((u) => setInfo({ name: u.name, subtitle: code.id, isMe: u.is_me }))
        .catch((e) => setLoadError(e.message));
    }
  }, [code]);

  function review() {
    setError('');
    if (!ore) return setError('Enter an amount, e.g. 129');
    if (ore < 100) return setError('Minimum is 1 kr');
    if (info?.isMe || code.id === myPhone) return setError('You cannot pay yourself');
    setStep('confirm');
  }

  async function pay() {
    setError('');
    setLoading(true);
    try {
      const body = { amount_ore: ore, note: note.trim() || undefined };
      if (code.kind === 'merchant') await payMerchant(code.id, body, keyRef.current);
      else await sendMoney({ to_phone: code.id, ...body }, keyRef.current);
      setStep('done');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  if (loadError) {
    return (
      <View style={{ padding: 24 }}>
        <BackHeader title="Pay" onBack={onBack} />
        <Text style={{ color: colors.red }}>{loadError}</Text>
      </View>
    );
  }
  if (!info) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.blue} />
      </View>
    );
  }

  if (step === 'done') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <View
          style={{
            width: 80, height: 80, borderRadius: 40, backgroundColor: colors.green,
            alignItems: 'center', justifyContent: 'center', marginBottom: 20,
          }}
        >
          <Text style={{ color: '#fff', fontSize: 40, fontWeight: '800' }}>✓</Text>
        </View>
        <Text style={{ fontSize: 24, fontWeight: '800', color: colors.text }}>Paid</Text>
        <Text style={{ fontSize: 16, color: colors.muted, marginTop: 8, marginBottom: 32 }}>
          {formatKr(ore)} to {info.name}
        </Text>
        <View style={{ alignSelf: 'stretch' }}>
          <Button title="Done" onPress={onDone} />
        </View>
      </View>
    );
  }

  const header = (
    <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 20, alignItems: 'center', marginBottom: 20 }}>
      <View
        style={{
          width: 56, height: 56, borderRadius: 28, backgroundColor: colors.blue,
          alignItems: 'center', justifyContent: 'center', marginBottom: 10,
        }}
      >
        <Text style={{ color: '#fff', fontSize: 24, fontWeight: '800' }}>{info.name.charAt(0)}</Text>
      </View>
      <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text }}>{info.name}</Text>
      <Text style={{ fontSize: 13, color: colors.muted, textTransform: code.kind === 'merchant' ? 'capitalize' : 'none' }}>
        {info.subtitle}
      </Text>
      {info.isMe ? <Text style={{ color: colors.red, marginTop: 8 }}>This is your own code</Text> : null}
    </View>
  );

  if (step === 'confirm') {
    return (
      <ScrollView contentContainerStyle={{ padding: 24 }}>
        <BackHeader title="Confirm payment" onBack={() => { keyRef.current = newKey(); setError(''); setStep('form'); }} />
        {header}
        <Text style={{ textAlign: 'center', fontSize: 36, fontWeight: '800', color: colors.text, marginBottom: 20 }}>
          {formatKr(ore)}
        </Text>
        <ErrorText>{error}</ErrorText>
        <Button title="Confirm and pay" onPress={pay} loading={loading} color={colors.green} />
        <Button title="Cancel" onPress={onBack} outline />
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 24 }} keyboardShouldPersistTaps="handled">
      <BackHeader title="Pay" onBack={onBack} />
      {header}
      <Field
        label={fixed ? 'Amount (fixed by the code)' : 'Amount (kr)'}
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
        editable={!fixed}
        placeholder="129"
      />
      <Field label="Message (optional)" value={note} onChangeText={setNote} maxLength={140} />
      <ErrorText>{error}</ErrorText>
      <Button title="Continue" onPress={review} />
    </ScrollView>
  );
}
