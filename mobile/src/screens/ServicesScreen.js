import { useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../theme';

const CARDS = [
  ['Hotels', 'Search & book rooms', '#2563EB'],
  ['Cinema', 'Tickets & showtimes', '#9333EA'],
  ['Shop', 'Online stores', '#EA580C'],
  ['Food', 'Order from restaurants', '#DC2626'],
];

export default function ServicesScreen() {
  const [message, setMessage] = useState('');
  return (
    <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }}>
      <Text style={{ fontSize: 24, fontWeight: '700', color: colors.text }}>Services</Text>
      <Text style={{ fontSize: 13, color: colors.muted, marginBottom: 16 }}>Everything you can pay for</Text>
      {message ? <Text style={{ color: colors.muted, marginBottom: 12 }}>{message}</Text> : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 }}>
        {CARDS.map(([name, desc, color]) => (
          <TouchableOpacity
            key={name}
            onPress={() => setMessage(`${name} is coming in Phase 7`)}
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
    </ScrollView>
  );
}
