import { ScrollView, Text, View } from 'react-native';
import { Button } from '../ui';
import { colors } from '../theme';

function Row({ label, value }) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ fontSize: 12, color: colors.muted }}>{label}</Text>
      <Text style={{ fontSize: 16, color: colors.text, fontWeight: '600' }}>{value}</Text>
    </View>
  );
}

export default function ProfileScreen({ wallet, onLogout, onOrders, onBusiness }) {
  return (
    <ScrollView contentContainerStyle={{ padding: 24 }}>
      <Text style={{ fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: 20 }}>Profile</Text>
      <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 24 }}>
        <Row label="Name" value={wallet.full_name} />
        <Row label="Email" value={wallet.email} />
        <Row label="Phone" value={wallet.phone} />
      </View>
      <Button title="My orders" onPress={onOrders} />
      <Button title="My business" onPress={onBusiness} outline />
      <Button title="Log out" onPress={onLogout} color={colors.red} outline />
      <Text style={{ textAlign: 'center', color: colors.muted, fontSize: 12, marginTop: 16 }}>
        Prototype: test money only
      </Text>
    </ScrollView>
  );
}
