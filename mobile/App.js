import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { colors } from './src/theme';
import { Button, TabBar } from './src/ui';
import { clearToken, loadToken } from './src/storage';
import { getHistory, getWallet, newKey, topup } from './src/api';
import AuthScreen from './src/screens/AuthScreen';
import HomeScreen from './src/screens/HomeScreen';
import SendScreen from './src/screens/SendScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import ServicesScreen from './src/screens/ServicesScreen';
import ProfileScreen from './src/screens/ProfileScreen';

function Centered({ children }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      {children}
    </View>
  );
}

export default function App() {
  const [booting, setBooting] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const [wallet, setWallet] = useState(null);
  const [history, setHistory] = useState([]);
  const [screen, setScreen] = useState('home'); // home | services | history | profile | send
  const [loadError, setLoadError] = useState('');

  const logout = useCallback(async () => {
    await clearToken();
    setLoggedIn(false);
    setWallet(null);
    setHistory([]);
    setLoadError('');
    setScreen('home');
  }, []);

  // Fetch balance and history from the API
  const reload = useCallback(async () => {
    try {
      const [w, h] = await Promise.all([getWallet(), getHistory()]);
      setWallet(w);
      setHistory(h);
      setLoadError('');
    } catch (e) {
      if (e.status === 401) await logout(); // token expired
      else setLoadError(e.message);
    }
  }, [logout]);

  // When the app opens: are we already logged in?
  useEffect(() => {
    (async () => {
      const token = await loadToken();
      if (token) {
        setLoggedIn(true);
        await reload();
      }
      setBooting(false);
    })();
  }, [reload]);

  // Refresh the numbers whenever the user changes screen
  useEffect(() => {
    if (loggedIn && wallet) reload();
  }, [screen]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleAuthed() {
    setLoggedIn(true);
    setScreen('home');
    reload();
  }

  async function addTestMoney() {
    await topup(50000, newKey()); // 500 kr
    await reload();
  }

  let content;
  if (booting) {
    content = <Centered><ActivityIndicator size="large" color={colors.blue} /></Centered>;
  } else if (!loggedIn) {
    content = <AuthScreen onAuthed={handleAuthed} />;
  } else if (!wallet) {
    content = (
      <Centered>
        {loadError ? (
          <View style={{ alignSelf: 'stretch' }}>
            <Text style={{ color: colors.red, textAlign: 'center', marginBottom: 16 }}>{loadError}</Text>
            <Button title="Try again" onPress={reload} />
            <Button title="Log out" onPress={logout} outline />
          </View>
        ) : (
          <ActivityIndicator size="large" color={colors.blue} />
        )}
      </Centered>
    );
  } else if (screen === 'send') {
    content = <SendScreen onBack={() => setScreen('home')} onDone={() => setScreen('home')} />;
  } else {
    content = (
      <View style={{ flex: 1 }}>
        <View style={{ flex: 1 }}>
          {screen === 'home' && (
            <HomeScreen
              wallet={wallet}
              history={history}
              onSend={() => setScreen('send')}
              onServices={() => setScreen('services')}
              onSeeAll={() => setScreen('history')}
              onTopup={addTestMoney}
            />
          )}
          {screen === 'services' && <ServicesScreen />}
          {screen === 'history' && <HistoryScreen history={history} />}
          {screen === 'profile' && <ProfileScreen wallet={wallet} onLogout={logout} />}
        </View>
        <TabBar active={screen} onChange={setScreen} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: !loggedIn && !booting ? colors.blue : colors.bg }}>
        <StatusBar style={!loggedIn && !booting ? 'light' : 'dark'} />
        {content}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
