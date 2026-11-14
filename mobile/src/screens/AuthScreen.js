import { useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Button, ErrorText, Field } from '../ui';
import { colors } from '../theme';
import { login, register } from '../api';
import { saveToken } from '../storage';

export default function AuthScreen({ onAuthed }) {
  const [mode, setMode] = useState('login'); // login | register
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+46');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    setError('');
    setLoading(true);
    try {
      const data =
        mode === 'login'
          ? await login({ email, password })
          : await register({ full_name: fullName, email, phone, password });
      await saveToken(data.token);
      onAuthed();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.blue }}
      contentContainerStyle={{ flexGrow: 1 }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={{ alignItems: 'center', paddingTop: 48, paddingBottom: 32 }}>
        <View
          style={{
            width: 72, height: 72, borderRadius: 36, backgroundColor: '#fff',
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 34, fontWeight: '800', color: colors.blue }}>M</Text>
        </View>
        <Text style={{ fontSize: 30, fontWeight: '800', color: '#fff', marginTop: 16 }}>MultiWallet</Text>
        <Text style={{ fontSize: 14, color: '#BFDBFE', marginTop: 6 }}>
          Pay. Book. Order. One app.
        </Text>
      </View>

      <View
        style={{
          flex: 1, backgroundColor: colors.bg, borderTopLeftRadius: 28,
          borderTopRightRadius: 28, padding: 24,
        }}
      >
        <Text style={{ fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: 20 }}>
          {mode === 'login' ? 'Log in' : 'Create account'}
        </Text>

        {mode === 'register' && (
          <>
            <Field label="Full name" value={fullName} onChangeText={setFullName} autoCapitalize="words" />
            <Field label="Phone number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          </>
        )}
        <Field
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCorrect={false}
        />
        <Field
          label="Password (min 8 characters)"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <ErrorText>{error}</ErrorText>
        <Button
          title={mode === 'login' ? 'Log in' : 'Create account'}
          onPress={submit}
          loading={loading}
        />

        <TouchableOpacity
          onPress={() => {
            setError('');
            setMode(mode === 'login' ? 'register' : 'login');
          }}
        >
          <Text style={{ textAlign: 'center', color: colors.blue, fontWeight: '600', marginTop: 4 }}>
            {mode === 'login' ? 'New here? Create an account' : 'Have an account? Log in'}
          </Text>
        </TouchableOpacity>

        <Text style={{ textAlign: 'center', color: colors.muted, fontSize: 12, marginTop: 28 }}>
          Prototype: test money only
        </Text>
      </View>
    </ScrollView>
  );
}
