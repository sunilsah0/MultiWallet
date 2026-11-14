import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const KEY = 'multiwallet_token';

// On phones the token goes in secure storage. In the web preview we use localStorage.
export async function saveToken(token) {
  if (Platform.OS === 'web') {
    try { localStorage.setItem(KEY, token); } catch {}
    return;
  }
  await SecureStore.setItemAsync(KEY, token);
}

export async function loadToken() {
  if (Platform.OS === 'web') {
    try { return localStorage.getItem(KEY); } catch { return null; }
  }
  return SecureStore.getItemAsync(KEY);
}

export async function clearToken() {
  if (Platform.OS === 'web') {
    try { localStorage.removeItem(KEY); } catch {}
    return;
  }
  await SecureStore.deleteItemAsync(KEY);
}
