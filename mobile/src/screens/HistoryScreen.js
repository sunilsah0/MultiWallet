import { ScrollView, Text } from 'react-native';
import { TransactionRow } from '../ui';
import { colors } from '../theme';

export default function HistoryScreen({ history }) {
  return (
    <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }}>
      <Text style={{ fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: 16 }}>History</Text>
      {history.length === 0 ? (
        <Text style={{ color: colors.muted }}>No payments yet.</Text>
      ) : (
        history.map((tx) => <TransactionRow key={tx.id} tx={tx} />)
      )}
    </ScrollView>
  );
}
