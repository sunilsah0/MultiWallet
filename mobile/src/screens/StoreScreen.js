import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Button, ErrorText, Field } from '../ui';
import { BackHeader } from '../components';
import { colors } from '../theme';
import { createOrder, getStore, newKey } from '../api';
import { formatKr } from '../format';

function QtyButton({ label, onPress, disabled }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={{
        width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: colors.border,
        backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.4 : 1,
      }}
    >
      <Text style={{ fontSize: 20, color: colors.text }}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function StoreScreen({ storeId, onBack, onSeeOrders }) {
  const [store, setStore] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [cart, setCart] = useState({}); // product id -> quantity
  const [note, setNote] = useState('');
  const [step, setStep] = useState('shop'); // shop | confirm | done
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const keyRef = useRef(newKey()); // one key per order attempt

  useEffect(() => {
    getStore(storeId)
      .then(setStore)
      .catch((e) => setLoadError(e.message));
  }, [storeId]);

  // Cart as lines (display only: the server recalculates the real price)
  const lines = useMemo(
    () => (store ? store.products.filter((p) => cart[p.id]).map((p) => ({ ...p, quantity: cart[p.id] })) : []),
    [store, cart]
  );
  const total = lines.reduce((sum, l) => sum + l.price_ore * l.quantity, 0);

  function change(productId, delta) {
    setCart((c) => {
      const q = Math.max(0, Math.min(20, (c[productId] || 0) + delta));
      const next = { ...c };
      if (q === 0) delete next[productId];
      else next[productId] = q;
      return next;
    });
  }

  async function pay() {
    setError('');
    setLoading(true);
    try {
      const r = await createOrder(
        {
          merchant_id: store.merchant.id,
          items: lines.map((l) => ({ product_id: l.id, quantity: l.quantity })),
          note: note.trim() || undefined,
        },
        keyRef.current
      );
      setResult(r);
      setStep('done');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function backToShop() {
    keyRef.current = newKey(); // changed cart = a new order
    setError('');
    setStep('shop');
  }

  if (loadError) {
    return (
      <View style={{ padding: 24 }}>
        <BackHeader title="Store" onBack={onBack} />
        <Text style={{ color: colors.red }}>{loadError}</Text>
      </View>
    );
  }
  if (!store) {
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
        <Text style={{ fontSize: 24, fontWeight: '800', color: colors.text }}>Order placed</Text>
        <Text style={{ fontSize: 16, color: colors.muted, marginTop: 8 }}>
          You paid {formatKr(result.total_ore)} to {store.merchant.name}
        </Text>
        <Text style={{ fontSize: 12, color: colors.muted, marginTop: 4, marginBottom: 32 }}>
          Order {result.order_id.slice(0, 8)}
        </Text>
        <View style={{ alignSelf: 'stretch' }}>
          <Button title="See my orders" onPress={onSeeOrders} />
          <Button title="Back to services" onPress={onBack} outline />
        </View>
      </View>
    );
  }

  if (step === 'confirm') {
    return (
      <ScrollView contentContainerStyle={{ padding: 24 }} keyboardShouldPersistTaps="handled">
        <BackHeader title="Confirm order" onBack={backToShop} />
        <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 20 }}>
          <Text style={{ color: colors.muted, fontSize: 14, marginBottom: 12 }}>{store.merchant.name}</Text>
          {lines.map((l) => (
            <View key={l.id} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ color: colors.text, flex: 1 }}>
                {l.quantity} × {l.name}
              </Text>
              <Text style={{ color: colors.text }}>{formatKr(l.price_ore * l.quantity)}</Text>
            </View>
          ))}
          <View style={{ height: 1, backgroundColor: '#E5E7EB', marginVertical: 12 }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>Total</Text>
            <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>{formatKr(total)}</Text>
          </View>
        </View>
        <Field label="Message to the business (optional)" value={note} onChangeText={setNote} maxLength={140} />
        <ErrorText>{error}</ErrorText>
        <Button title={`Confirm and pay ${formatKr(total)}`} onPress={pay} loading={loading} color={colors.green} />
        <Button title="Back to menu" onPress={backToShop} outline />
      </ScrollView>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 24 }}>
        <BackHeader title={store.merchant.name} onBack={onBack} />
        {store.products.length === 0 ? <Text style={{ color: colors.muted }}>No items yet.</Text> : null}
        {store.products.map((p) => (
          <View
            key={p.id}
            style={{
              backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 10,
              flexDirection: 'row', alignItems: 'center',
            }}
          >
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>{p.name}</Text>
              {p.description ? (
                <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>{p.description}</Text>
              ) : null}
              <Text style={{ fontSize: 15, color: colors.text, marginTop: 4 }}>
                {formatKr(p.price_ore)}
                {p.unit ? <Text style={{ fontSize: 12, color: colors.muted }}> {p.unit}</Text> : null}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <QtyButton label="−" onPress={() => change(p.id, -1)} disabled={!cart[p.id]} />
              <Text style={{ minWidth: 28, textAlign: 'center', fontWeight: '700', color: colors.text }}>
                {cart[p.id] || 0}
              </Text>
              <QtyButton label="+" onPress={() => change(p.id, 1)} />
            </View>
          </View>
        ))}
      </ScrollView>

      {lines.length > 0 ? (
        <View style={{ padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E5E7EB' }}>
          <Button
            title={`Review order · ${formatKr(total)}`}
            onPress={() => setStep('confirm')}
            color={colors.green}
          />
        </View>
      ) : null}
    </View>
  );
}
