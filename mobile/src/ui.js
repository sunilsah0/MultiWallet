import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { colors } from './theme';
import { formatKr, formatDate } from './format';

export function Button({
  title, onPress, color = colors.blue, textColor = '#fff',
  loading = false, disabled = false, outline = false,
}) {
  const off = loading || disabled;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={off}
      activeOpacity={0.8}
      style={{
        backgroundColor: outline ? 'transparent' : color,
        borderWidth: outline ? 1.5 : 0,
        borderColor: color,
        borderRadius: 14,
        height: 54,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: off ? 0.6 : 1,
        marginBottom: 12,
      }}
    >
      {loading ? (
        <ActivityIndicator color={outline ? color : textColor} />
      ) : (
        <Text style={{ color: outline ? color : textColor, fontSize: 16, fontWeight: '600' }}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

export function Field({ label, ...props }) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ fontSize: 12, color: colors.muted, fontWeight: '500', marginBottom: 6 }}>
        {label}
      </Text>
      <TextInput
        placeholderTextColor="#9CA3AF"
        autoCapitalize="none"
        style={{
          backgroundColor: '#fff',
          borderWidth: 1.2,
          borderColor: colors.border,
          borderRadius: 12,
          height: 48,
          paddingHorizontal: 16,
          fontSize: 16,
          color: colors.text,
        }}
        {...props}
      />
    </View>
  );
}

export function ErrorText({ children }) {
  if (!children) return null;
  return <Text style={{ color: colors.red, marginBottom: 12, fontSize: 14 }}>{children}</Text>;
}

export function TransactionRow({ tx }) {
  const positive = tx.amount_ore > 0;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 14,
        marginBottom: 8,
      }}
    >
      <View
        style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#E5E7EB', marginRight: 12 }}
      />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>
          {tx.counterparty || 'MultiWallet'}
        </Text>
        <Text style={{ fontSize: 12, color: colors.muted }}>
          {formatDate(tx.created_at)}
          {tx.note ? ` · ${tx.note}` : ''}
        </Text>
      </View>
      <Text style={{ fontSize: 15, fontWeight: '700', color: positive ? colors.green : colors.red }}>
        {positive ? '+' : ''}
        {formatKr(tx.amount_ore)}
      </Text>
    </View>
  );
}

const TABS = [
  ['home', 'Home'],
  ['services', 'Services'],
  ['history', 'History'],
  ['profile', 'Profile'],
];

export function TabBar({ active, onChange }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        paddingVertical: 10,
      }}
    >
      {TABS.map(([key, label]) => {
        const on = active === key;
        return (
          <TouchableOpacity
            key={key}
            onPress={() => onChange(key)}
            style={{ flex: 1, alignItems: 'center' }}
          >
            <View
              style={{
                width: 22,
                height: 22,
                borderRadius: 6,
                backgroundColor: on ? colors.blue : '#D1D5DB',
                marginBottom: 4,
              }}
            />
            <Text
              style={{
                fontSize: 11,
                color: on ? colors.blue : colors.muted,
                fontWeight: on ? '600' : '400',
              }}
            >
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
