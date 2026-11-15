import { Text, TouchableOpacity, View } from 'react-native';
import { colors } from './theme';

export const CATEGORY_COLORS = {
  hotels: '#2563EB',
  cinema: '#9333EA',
  shop: '#EA580C',
  food: '#DC2626',
};

export function BackHeader({ title, onBack }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
      {onBack ? (
        <TouchableOpacity onPress={onBack} style={{ paddingRight: 16 }}>
          <Text style={{ fontSize: 26, color: colors.text }}>←</Text>
        </TouchableOpacity>
      ) : null}
      <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text, flex: 1 }} numberOfLines={1}>
        {title}
      </Text>
    </View>
  );
}

const PILLS = {
  paid: ['#DBEAFE', '#1E40AF'],
  completed: ['#DCFCE7', '#166534'],
  cancelled: ['#FEE2E2', '#991B1B'],
  pending: ['#F3F4F6', '#374151'],
};

export function StatusPill({ status }) {
  const [bg, fg] = PILLS[status] || PILLS.pending;
  return (
    <View style={{ backgroundColor: bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 }}>
      <Text style={{ color: fg, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>{status}</Text>
    </View>
  );
}

export function CategoryBadge({ category }) {
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        backgroundColor: CATEGORY_COLORS[category] || colors.muted,
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 999,
        marginBottom: 8,
      }}
    >
      <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>
        {category}
      </Text>
    </View>
  );
}
