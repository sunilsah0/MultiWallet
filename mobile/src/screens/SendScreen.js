import { useRef, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Button, ErrorText, Field } from '../ui';
import { colors } from '../theme';
import { newKey, sendMoney } from '../api';
import { formatKr, krToOre } from '../format';

function Header({ title, onBack }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
      {onBack ? (
        <TouchableOpacity onPress={onBack} style={{ paddingRight: 16 }}>
          <Text style={{ fontSize: 26, color: colors.text }}>←</Text>
        </TouchableOpacity>
      ) : null}
      <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text }}>{title}</Text>
    </View>
  );
}

export default function SendScreen({ onBack, onDone }) {
  const [step, setStep] = useState('form'); // form | confirm | done
  const [phone, setPhone] = useState('+46');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const keyRef = useRef(newKey()); // one key per payment attempt
  const amountOre = krToOre(amount);

  function review() {
    setError('');
    if (phone.replace(/[\s-]/g, '').length < 9) {
      return setError('Enter a full phone number, e.g. +46701234567');
    }
    if (!amountOre) return setError('Enter an amount, e.g. 200');
    if (amountOre < 100) return setError('Minimum is 1 kr');
    setStep('confirm');
  }

  async function confirm() {
    setError('');
    setLoading(true);
    try {
      await sendMoney(
        { to_phone: phone, amount_ore: amountOre, note: note.trim() || undefined },
        keyRef.current
      );
      setStep('done');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function backToForm() {
    keyRef.current = newKey(); // changed details = a new payment
    setError('');
    setStep('form');
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
        <Text style={{ fontSize: 24, fontWeight: '800', color: colors.text }}>Sent!</Text>
        <Text style={{ fontSize: 16, color: colors.muted, marginTop: 8, marginBottom: 32 }}>
          {formatKr(amountOre)} to {phone}
        </Text>
        <View style={{ alignSelf: 'stretch' }}>
          <Button title="Done" onPress={onDone} />
        </View>
      </View>
    );
  }

  if (step === 'confirm') {
    return (
      <ScrollView contentContainerStyle={{ padding: 24 }}>
        <Header title="Confirm payment" onBack={backToForm} />
        <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 24, alignItems: 'center', marginBottom: 20 }}>
          <Text style={{ color: colors.muted, fontSize: 14 }}>You are paying</Text>
          <Text style={{ fontSize: 34, fontWeight: '800', color: colors.text, marginVertical: 8 }}>
            {formatKr(amountOre)}
          </Text>
          <Text style={{ fontSize: 16, color: colors.text }}>to {phone}</Text>
          {note.trim() ? <Text style={{ color: colors.muted, marginTop: 8 }}>"{note.trim()}"</Text> : null}
        </View>
        <ErrorText>{error}</ErrorText>
        <Button title="Confirm and pay" onPress={confirm} loading={loading} color={colors.green} />
        <Button title="Cancel" onPress={onBack} outline />
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 24 }} keyboardShouldPersistTaps="handled">
      <Header title="Send money" onBack={onBack} />
      <Field label="To (phone number)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <Field label="Amount (kr)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="200" />
      <Field label="Message (optional)" value={note} onChangeText={setNote} placeholder="Lunch" maxLength={140} />
      <ErrorText>{error}</ErrorText>
      <Button title="Continue" onPress={review} />
    </ScrollView>
  );
}
