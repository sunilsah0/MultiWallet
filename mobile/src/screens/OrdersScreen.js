import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { BackHeader, CategoryBadge, StatusPill } from '../components';
import { colors } from '../theme';
import { myOrders } from '../api';
import { formatDate, formatKr } from '../format';

export default function OrdersScreen({ onBack }) {
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    myOrders()
      .then(setOrders)
      .catch((e) => setError(e.message));
  }, []);

  return (
    <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }}>
      <BackHeader title="My orders" onBack={onBack} />
      {error ? <Text style={{ color: colors.red }}>{error}</Text> : null}
      {!orders && !error ? <ActivityIndicator color={colors.blue} /> : null}
      {orders && orders.length === 0 ? <Text style={{ color: colors.muted }}>No orders yet. Try Services.</Text> : null}
      {orders?.map((o) => (
        <View key={o.id} style={{ backgroundColor: '#fff', borderRadius: 18, padding: 18, marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <CategoryBadge category={o.category} />
              <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text }}>{o.merchant_name}</Text>
              <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>
                {formatDate(o.created_at)} · {o.id.slice(0, 8)}
              </Text>
            </View>
            <StatusPill status={o.status} />
          </View>
          <View style={{ marginTop: 12 }}>
            {o.items.map((i, n) => (
              <View key={n} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={{ color: colors.text, flex: 1 }}>
                  {i.quantity} × {i.name}
                </Text>
                <Text style={{ color: colors.text }}>{formatKr(i.unit_price_ore * i.quantity)}</Text>
              </View>
            ))}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
              <Text style={{ fontWeight: '800', color: colors.text }}>Total</Text>
              <Text style={{ fontWeight: '800', color: colors.text }}>{formatKr(o.total_ore)}</Text>
            </View>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}
