import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { Button, ErrorText, Field } from '../ui';
import { BackHeader, StatusPill } from '../components';
import { colors } from '../theme';
import {
  cancelRequest, createRequest, declineRequest, incomingRequests, outgoingRequests, payRequest,
} from '../api';
import { formatDate, formatKr, krToOre } from '../format';

export default function RequestsScreen({ onBack }) {
  const [incoming, setIncoming] = useState(null);
  const [outgoing, setOutgoing] = useState(null);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const [phone, setPhone] = useState('+46');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);

  const [confirmId, setConfirmId] = useState(null); // tap Pay twice to confirm
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    try {
      const [i, o] = await Promise.all([incomingRequests(), outgoingRequests()]);
      setIncoming(i);
      setOutgoing(o);
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function create() {
    setError('');
    setInfo('');
    const ore = krToOre(amount);
    if (!ore) return setError('Enter an amount, e.g. 75');
    setSending(true);
    try {
      await createRequest({ from_phone: phone, amount_ore: ore, note: note.trim() || undefined });
      setInfo(`Request for ${formatKr(ore)} sent to ${phone}`);
      setAmount('');
      setNote('');
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  }

  async function act(fn, id) {
    setError('');
    setInfo('');
    setBusyId(id);
    try {
      await fn(id);
    } catch (e) {
      setError(e.message);
    } finally {
      setConfirmId(null);
      setBusyId(null);
      await load();
    }
  }

  function tapPay(r) {
    if (confirmId !== r.id) {
      setConfirmId(r.id); // first tap: ask to confirm
      return;
    }
    act(payRequest, r.id); // second tap: pay
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <BackHeader title="Requests" onBack={onBack} />
      <ErrorText>{error}</ErrorText>
      {info ? <Text style={{ color: colors.green, fontWeight: '600', marginBottom: 12 }}>{info}</Text> : null}

      <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: 10 }}>Requests for you</Text>
      {!incoming ? <ActivityIndicator color={colors.blue} /> : null}
      {incoming && incoming.length === 0 ? (
        <Text style={{ color: colors.muted, marginBottom: 16 }}>Nobody is asking you to pay right now.</Text>
      ) : null}
      {incoming?.map((r) => (
        <View key={r.id} style={{ backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 10 }}>
          <Text style={{ color: colors.text }}>
            <Text style={{ fontWeight: '700' }}>{r.requester_name}</Text> asks for{' '}
            <Text style={{ fontWeight: '800' }}>{formatKr(r.amount_ore)}</Text>
          </Text>
          <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2, marginBottom: 12 }}>
            {formatDate(r.created_at)}
            {r.note ? ` · ${r.note}` : ''}
          </Text>
          <Button
            title={confirmId === r.id ? `Tap again to pay ${formatKr(r.amount_ore)}` : `Pay ${formatKr(r.amount_ore)}`}
            onPress={() => tapPay(r)}
            loading={busyId === r.id}
            color={colors.green}
          />
          <Button title="Decline" onPress={() => act(declineRequest, r.id)} outline disabled={busyId === r.id} />
        </View>
      ))}

      <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text, marginTop: 16, marginBottom: 10 }}>
        Request money
      </Text>
      <Field label="From (phone number)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <Field label="Amount (kr)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="75" />
      <Field label="What is it for? (optional)" value={note} onChangeText={setNote} maxLength={140} />
      <Button title="Send request" onPress={create} loading={sending} />

      <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text, marginTop: 16, marginBottom: 10 }}>
        Your requests
      </Text>
      {outgoing && outgoing.length === 0 ? (
        <Text style={{ color: colors.muted }}>You have not asked anyone yet.</Text>
      ) : null}
      {outgoing?.map((r) => (
        <View key={r.id} style={{ backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 10 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: colors.text, flex: 1, paddingRight: 8 }}>
              {formatKr(r.amount_ore)} from <Text style={{ fontWeight: '700' }}>{r.payer_name}</Text>
            </Text>
            <StatusPill status={r.status === 'paid' ? 'completed' : r.status} />
          </View>
          <Text style={{ fontSize: 12, color: colors.muted, marginTop: 4 }}>
            {formatDate(r.created_at)}
            {r.note ? ` · ${r.note}` : ''}
          </Text>
          {r.status === 'pending' ? (
            <View style={{ marginTop: 12 }}>
              <Button title="Cancel request" onPress={() => act(cancelRequest, r.id)} outline color={colors.red} disabled={busyId === r.id} />
            </View>
          ) : null}
        </View>
      ))}
    </ScrollView>
  );
}
