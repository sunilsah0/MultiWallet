import { ScrollView, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { BackHeader } from '../components';
import { colors } from '../theme';
import { userCode } from '../qr';

export default function MyQrScreen({ wallet, onBack }) {
  const code = userCode(wallet.phone);
  return (
    <ScrollView contentContainerStyle={{ padding: 24, alignItems: 'center' }}>
      <View style={{ alignSelf: 'stretch' }}>
        <BackHeader title="My QR code" onBack={onBack} />
      </View>
      <View style={{ backgroundColor: '#fff', padding: 24, borderRadius: 24, alignItems: 'center' }}>
        <QRCode value={code} size={220} />
        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 16 }}>
          {wallet.full_name}
        </Text>
        <Text style={{ fontSize: 14, color: colors.muted }}>{wallet.phone}</Text>
      </View>
      <Text style={{ color: colors.muted, fontSize: 13, textAlign: 'center', marginTop: 20 }}>
        Anyone can scan this to pay you. It only contains your phone number, never a password.
      </Text>
      <Text selectable style={{ color: colors.text, fontSize: 11, marginTop: 16, textAlign: 'center' }}>
        {code}
      </Text>
    </ScrollView>
  );
}
