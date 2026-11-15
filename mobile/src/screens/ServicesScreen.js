import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../theme';

const CARDS = [
  ['hotels', 'Hotels', 'Book rooms', '#2563EB'],
  ['cinema', 'Cinema', 'Tickets and snacks', '#9333EA'],
  ['shop', 'Shop', 'Online stores', '#EA580C'],
  ['food', 'Food', 'Order from restaurants', '#DC2626'],
];

export default function ServicesScreen({ onOpenCategory, onOrders }) {
  return (
    <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }}>
      <Text style={{ fontSize: 24, fontWeight: '700', color: colors.text }}>Services</Text>
      <Text style={{ fontSize: 13, color: colors.muted, marginBottom: 16 }}>Everything you can pay for</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 }}>
        {CARDS.map(([key, name, desc, color]) => (
          <TouchableOpacity
            key={key}
            onPress={() => onOpenCategory(key)}
            style={{ width: '50%', padding: 6 }}
          >
            <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 16, minHeight: 170 }}>
              <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: color, marginBottom: 20 }} />
              <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>{name}</Text>
              <Text style={{ fontSize: 12, color: colors.muted, marginTop: 4 }}>{desc}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity onPress={onOrders} style={{ marginTop: 20 }}>
        <Text style={{ color: colors.blue, fontWeight: '600', textAlign: 'center' }}>See my orders →</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
