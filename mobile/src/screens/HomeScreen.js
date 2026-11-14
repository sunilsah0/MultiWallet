import { useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Button, TransactionRow } from '../ui';
import { colors } from '../theme';
import { formatKr } from '../format';

function ActionButton({ label, color, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flex: 1, backgroundColor: '#fff', borderRadius: 16, paddingVertical: 16,
        alignItems: 'center', marginHorizontal: 4,
      }}
    >
      <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: color, marginBottom: 8 }} />
      <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>{label}</Text>
    </TouchableOpacity>
  );
}

const SERVICES = [
  ['Hotels', '#2563EB'],
  ['Cinema', '#9333EA'],
  ['Shop', '#EA580C'],
  ['Food', '#DC2626'],
];

export default function HomeScreen({ wallet, history, onSend, onServices, onSeeAll, onTopup }) {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const firstName = (wallet.full_name || '').split(' ')[0];

  async function addTestMoney() {
    setMessage('');
    setBusy(true);
    try {
      await onTopup();
    } catch (e) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }}>
      <Text style={{ fontSize: 22, fontWeight: '700', color: colors.text }}>Hi, {firstName}</Text>
      <Text style={{ fontSize: 13, color: colors.muted, marginBottom: 16 }}>Welcome back</Text>

      <View style={{ backgroundColor: colors.blue, borderRadius: 22, padding: 24, marginBottom: 16 }}>
        <Text style={{ color: '#BFDBFE', fontSize: 14 }}>Balance</Text>
        <Text style={{ color: '#fff', fontSize: 34, fontWeight: '800', marginVertical: 8 }}>
          {formatKr(wallet.balance_ore)}
        </Text>
        <Text style={{ color: '#BFDBFE', fontSize: 12 }}>MultiWallet · {wallet.phone}</Text>
      </View>

      <View style={{ flexDirection: 'row', marginHorizontal: -4, marginBottom: 20 }}>
        <ActionButton label="Send" color={colors.blue} onPress={onSend} />
        <ActionButton label="Request" color={colors.green} onPress={() => setMessage('Request money is coming soon')} />
        <ActionButton label="Scan QR" color={colors.text} onPress={() => setMessage('QR scanning is coming soon')} />
      </View>

      {message ? <Text style={{ color: colors.muted, marginBottom: 12 }}>{message}</Text> : null}

      <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: 10 }}>Services</Text>
      <View style={{ flexDirection: 'row', marginHorizontal: -4, marginBottom: 24 }}>
        {SERVICES.map(([name, color]) => (
          <TouchableOpacity
            key={name}
            onPress={onServices}
            style={{
              flex: 1, backgroundColor: '#fff', borderRadius: 16, paddingVertical: 14,
              alignItems: 'center', marginHorizontal: 4,
            }}
          >
            <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: color, marginBottom: 8 }} />
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text }}>{name}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
        <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text }}>Recent</Text>
        <TouchableOpacity onPress={onSeeAll}>
          <Text style={{ color: colors.blue, fontWeight: '600' }}>See all</Text>
        </TouchableOpacity>
      </View>
      {history.length === 0 ? (
        <Text style={{ color: colors.muted, marginBottom: 20 }}>No payments yet.</Text>
      ) : (
        history.slice(0, 3).map((tx) => <TransactionRow key={tx.id} tx={tx} />)
      )}

      <View style={{ marginTop: 16 }}>
        <Button title="TEST: add 500 kr test money" onPress={addTestMoney} loading={busy} outline color={colors.green} />
      </View>
    </ScrollView>
  );
}
