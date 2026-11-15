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
import CategoryScreen from './src/screens/CategoryScreen';
import StoreScreen from './src/screens/StoreScreen';
import OrdersScreen from './src/screens/OrdersScreen';
import BusinessScreen from './src/screens/BusinessScreen';
import ScanScreen from './src/screens/ScanScreen';
import PayScreen from './src/screens/PayScreen';
import MyQrScreen from './src/screens/MyQrScreen';
import RequestsScreen from './src/screens/RequestsScreen';
import ProfileScreen from './src/screens/ProfileScreen';

// Which bottom tab lights up for each screen
const TAB_OF = {
  home: 'home',
  services: 'services',
  category: 'services',
  history: 'history',
  profile: 'profile',
  orders: 'profile',
  business: 'profile',
  requests: 'home',
  myqr: 'home',
};

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
  const [nav, setNav] = useState({ name: 'home', params: {} });
  const [loadError, setLoadError] = useState('');

  const screen = nav.name;
  const go = useCallback((name, params = {}) => setNav({ name, params }), []);

  const logout = useCallback(async () => {
    await clearToken();
    setLoggedIn(false);
    setWallet(null);
    setHistory([]);
    setLoadError('');
    setNav({ name: 'home', params: {} });
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
    go('home');
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
    content = <SendScreen onBack={() => go('home')} onDone={() => go('home')} />;
  } else if (screen === 'store') {
    // full screen: has its own cart bar instead of the tab bar
    content = (
      <StoreScreen
        key={nav.params.id}
        storeId={nav.params.id}
        onBack={() => go('category', { category: nav.params.category })}
        onSeeOrders={() => go('orders')}
      />
    );
  } else if (screen === 'scan') {
    content = (
      <ScanScreen
        onBack={() => go('home')}
        onMyQr={() => go('myqr')}
        onCode={(code) => go('pay', { code })}
      />
    );
  } else if (screen === 'pay') {
    content = (
      <PayScreen
        code={nav.params.code}
        myPhone={wallet.phone}
        onBack={() => go('scan')}
        onDone={() => go('home')}
      />
    );
  } else {
    content = (
      <View style={{ flex: 1 }}>
        <View style={{ flex: 1 }}>
          {screen === 'home' && (
            <HomeScreen
              wallet={wallet}
              history={history}
              onSend={() => go('send')}
              onScan={() => go('scan')}
              onRequest={() => go('requests')}
              onCategory={(c) => go('category', { category: c })}
              onSeeAll={() => go('history')}
              onTopup={addTestMoney}
            />
          )}
          {screen === 'services' && (
            <ServicesScreen
              onOpenCategory={(c) => go('category', { category: c })}
              onOrders={() => go('orders')}
            />
          )}
          {screen === 'category' && (
            <CategoryScreen
              category={nav.params.category}
              onBack={() => go('services')}
              onOpenStore={(id) => go('store', { id, category: nav.params.category })}
            />
          )}
          {screen === 'history' && <HistoryScreen history={history} />}
          {screen === 'orders' && <OrdersScreen onBack={() => go('profile')} />}
          {screen === 'business' && <BusinessScreen onBack={() => go('profile')} />}
          {screen === 'requests' && <RequestsScreen onBack={() => go('home')} />}
          {screen === 'myqr' && <MyQrScreen wallet={wallet} onBack={() => go('home')} />}
          {screen === 'profile' && (
            <ProfileScreen
              wallet={wallet}
              onLogout={logout}
              onOrders={() => go('orders')}
              onBusiness={() => go('business')}
            />
          )}
        </View>
        <TabBar active={TAB_OF[screen] || 'home'} onChange={(key) => go(key)} />
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
