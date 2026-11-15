import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { BackHeader, CategoryBadge } from '../components';
import { colors } from '../theme';
import { getCategory } from '../api';
import { formatKr } from '../format';

export default function CategoryScreen({ category, onBack, onOpenStore }) {
  const [list, setList] = useState(null);
  const [error, setError] = useState('');
  const title = category.charAt(0).toUpperCase() + category.slice(1);

  useEffect(() => {
    setList(null);
    getCategory(category)
      .then(setList)
      .catch((e) => setError(e.message));
  }, [category]);

  return (
    <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }}>
      <BackHeader title={title} onBack={onBack} />
      {error ? <Text style={{ color: colors.red }}>{error}</Text> : null}
      {!list && !error ? <ActivityIndicator color={colors.blue} /> : null}
      {list && list.length === 0 ? <Text style={{ color: colors.muted }}>No businesses here yet.</Text> : null}
      {list?.map((m) => (
        <TouchableOpacity
          key={m.id}
          onPress={() => onOpenStore(m.id)}
          style={{ backgroundColor: '#fff', borderRadius: 18, padding: 18, marginBottom: 12 }}
        >
          <CategoryBadge category={m.category} />
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>{m.name}</Text>
          <Text style={{ fontSize: 13, color: colors.muted, marginTop: 4 }}>
            {m.product_count} item{m.product_count === 1 ? '' : 's'}
            {m.from_price_ore !== null ? ` · from ${formatKr(m.from_price_ore)}` : ''}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}
