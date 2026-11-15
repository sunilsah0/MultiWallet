import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Button } from '../ui';
import { BackHeader, StatusPill } from '../components';
import { colors } from '../theme';
import { businessOrders, completeOrder, merchantSales, myMerchants } from '../api';
import { formatDate, formatKr } from '../format';

function Stat({ label, value }) {
  return (
    <View style={{ flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 14, marginHorizontal: 4 }}>
      <Text style={{ fontSize: 11, color: colors.muted }}>{label}</Text>
      <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text, marginTop: 4 }}>{value}</Text>
    </View>
  );
}

export default function BusinessScreen({ onBack }) {
  const [mine, setMine] = useState(null);
  const [selected, setSelected] = useState(null);
  const [data, setData] = useState(null); // { sales, orders }
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    myMerchants()
      .then((list) => {
        setMine(list);
        setSelected(list[0]?.id || null);
      })
      .catch((e) => setError(e.message));
  }, []);

  const load = useCallback(async (id) => {
    try {
      const [sales, orders] = await Promise.all([merchantSales(id), businessOrders(id)]);
      setData({ sales, orders });
      setError('');
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    if (!selected) return;
    setData(null);
    load(selected);
  }, [selected, load]);

  async function complete(orderId) {
    setBusyId(orderId);
    try {
      await completeOrder(orderId);
      await load(selected);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }}>
      <BackHeader title="My business" onBack={onBack} />
      {error ? <Text style={{ color: colors.red, marginBottom: 12 }}>{error}</Text> : null}
      {!mine && !error ? <ActivityIndicator color={colors.blue} /> : null}

      {mine && mine.length === 0 ? (
        <Text style={{ color: colors.muted }}>
          You have no business yet. Register one in the web app under "My business", then it shows up here.
        </Text>
      ) : null}

      {mine && mine.length > 0 ? (
        <>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 }}>
            {mine.map((m) => (
              <TouchableOpacity
                key={m.id}
                onPress={() => setSelected(m.id)}
                style={{
                  paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, marginRight: 8, marginBottom: 8,
                  borderWidth: 1.5, borderColor: m.id === selected ? colors.blue : colors.border,
                  backgroundColor: m.id === selected ? colors.blue : '#fff',
                }}
              >
                <Text style={{ color: m.id === selected ? '#fff' : colors.text, fontSize: 14 }}>{m.name}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {!data ? (
            <ActivityIndicator color={colors.blue} />
          ) : (
            <>
              <View style={{ flexDirection: 'row', marginHorizontal: -4, marginBottom: 16 }}>
                <Stat label="Total sales" value={formatKr(data.sales.summary.total_ore)} />
                <Stat label="Today (UTC)" value={formatKr(data.sales.summary.today_ore)} />
                <Stat label="Sales" value={String(data.sales.summary.sales_count)} />
              </View>

              <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: 10 }}>Orders</Text>
              {data.orders.length === 0 ? (
                <Text style={{ color: colors.muted }}>No orders yet.</Text>
              ) : null}
              {data.orders.map((o) => (
                <View key={o.id} style={{ backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 10 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text style={{ fontWeight: '700', color: colors.text }}>{o.customer}</Text>
                    <StatusPill status={o.status} />
                  </View>
                  <Text style={{ fontSize: 12, color: colors.muted, marginBottom: 6 }}>
                    {formatDate(o.created_at)} · {o.id.slice(0, 8)}
                  </Text>
                  <Text style={{ color: colors.text, marginBottom: 6 }}>
                    {o.items.map((i) => `${i.quantity} × ${i.name}`).join(', ')}
                  </Text>
                  <Text style={{ fontWeight: '800', color: colors.green, marginBottom: o.status === 'paid' ? 10 : 0 }}>
                    {formatKr(o.total_ore)}
                  </Text>
                  {o.status === 'paid' ? (
                    <Button
                      title="Mark completed"
                      onPress={() => complete(o.id)}
                      loading={busyId === o.id}
                      color={colors.green}
                    />
                  ) : null}
                </View>
              ))}
            </>
          )}
        </>
      ) : null}
    </ScrollView>
  );
}
