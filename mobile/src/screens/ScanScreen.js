import { useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Button, ErrorText, Field } from '../ui';
import { BackHeader } from '../components';
import { colors } from '../theme';
import { parseCode } from '../qr';

export default function ScanScreen({ onBack, onMyQr, onCode }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [pasted, setPasted] = useState('');
  const [error, setError] = useState('');
  const locked = useRef(false); // the camera reports the same code many times

  function handle(text) {
    const parsed = parseCode(text);
    if (!parsed) {
      setError('That is not a MultiWallet QR code');
      return false;
    }
    setError('');
    onCode(parsed);
    return true;
  }

  function onScanned({ data }) {
    if (locked.current) return;
    locked.current = true;
    if (!handle(data)) setTimeout(() => (locked.current = false), 1500); // allow another try
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 24 }} keyboardShouldPersistTaps="handled">
      <BackHeader title="Scan QR" onBack={onBack} />

      <View
        style={{
          height: 300, borderRadius: 20, overflow: 'hidden', backgroundColor: '#111827',
          alignItems: 'center', justifyContent: 'center', marginBottom: 16,
        }}
      >
        {permission?.granted ? (
          <CameraView
            style={{ width: '100%', height: '100%' }}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={onScanned}
          />
        ) : (
          <View style={{ padding: 24, alignSelf: 'stretch' }}>
            <Text style={{ color: '#fff', textAlign: 'center', marginBottom: 16 }}>
              Allow the camera to scan payment codes
            </Text>
            <Button title="Allow camera" onPress={requestPermission} color={colors.green} />
          </View>
        )}
      </View>

      <ErrorText>{error}</ErrorText>

      <Text style={{ color: colors.muted, fontSize: 13, marginBottom: 8 }}>
        No camera? Paste the code text instead:
      </Text>
      <Field
        label="Code"
        value={pasted}
        onChangeText={setPasted}
        placeholder="multiwallet://pay/merchant/..."
        autoCorrect={false}
      />
      <Button title="Continue" onPress={() => handle(pasted)} disabled={!pasted.trim()} />
      <Button title="Show my QR code" onPress={onMyQr} outline />
    </ScrollView>
  );
}
