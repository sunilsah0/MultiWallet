import { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Text, TextInput, View } from 'react-native';
import { Button } from './ui';
import { colors } from './theme';
import { setPinAsker } from './api';

// Shows the "Enter your payment PIN" box whenever the API layer needs a PIN.
export function PinProvider({ children }) {
  const [visible, setVisible] = useState(false);
  const [pin, setPin] = useState('');
  const resolver = useRef(null);

  const ask = useCallback(
    () =>
      new Promise((resolve) => {
        resolver.current = resolve;
        setPin('');
        setVisible(true);
      }),
    []
  );

  useEffect(() => {
    setPinAsker(ask);
    return () => setPinAsker(null);
  }, [ask]);

  function finish(value) {
    setVisible(false);
    const r = resolver.current;
    resolver.current = null;
    if (r) r(value);
  }

  return (
    <>
      {children}
      <Modal transparent animationType="fade" visible={visible} onRequestClose={() => finish(null)}>
        <View
          style={{
            flex: 1, backgroundColor: 'rgba(17,24,39,0.55)', alignItems: 'center',
            justifyContent: 'center', padding: 24,
          }}
        >
          <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 24, alignSelf: 'stretch' }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, textAlign: 'center', marginBottom: 16 }}>
              Enter your payment PIN
            </Text>
            <TextInput
              value={pin}
              onChangeText={(t) => setPin(t.replace(/\D/g, ''))}
              secureTextEntry
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
              style={{
                borderWidth: 1.2, borderColor: colors.border, borderRadius: 12, height: 56,
                fontSize: 28, textAlign: 'center', letterSpacing: 8, color: colors.text, marginBottom: 16,
              }}
            />
            <Button title="Confirm" onPress={() => finish(pin)} disabled={pin.length !== 6} color={colors.green} />
            <Button title="Cancel" onPress={() => finish(null)} outline />
          </View>
        </View>
      </Modal>
    </>
  );
}
