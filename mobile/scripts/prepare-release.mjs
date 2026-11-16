// Prepares the phone app for a release build (app id, camera permission text, API address).
//
//   node scripts/prepare-release.mjs com.yourname.multiwallet https://your-api.onrender.com
import fs from 'node:fs';

const [, , appId, apiUrl] = process.argv;
const validId = appId && /^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)+$/i.test(appId);
const validUrl = apiUrl && /^https:\/\/[^\s]+$/.test(apiUrl);
if (!validId || !validUrl) {
  console.error('Usage: node scripts/prepare-release.mjs <app id> <https API address>');
  console.error('Example: node scripts/prepare-release.mjs com.yourname.multiwallet https://multiwallet-api.onrender.com');
  process.exit(1);
}
const api = apiUrl.replace(/\/+$/, '');

// 1) app.json
const appPath = new URL('../app.json', import.meta.url);
const app = JSON.parse(fs.readFileSync(appPath, 'utf8'));
app.expo = app.expo || {};
const e = app.expo;
e.name = 'MultiWallet';
e.scheme = 'multiwallet';
e.android = { ...(e.android || {}), package: appId };
e.ios = { ...(e.ios || {}), bundleIdentifier: appId };
const plugins = (e.plugins || []).filter((p) => (Array.isArray(p) ? p[0] : p) !== 'expo-camera');
plugins.push([
  'expo-camera',
  { cameraPermission: 'MultiWallet uses the camera to scan payment QR codes.', recordAudioAndroid: false },
]);
e.plugins = plugins;
fs.writeFileSync(appPath, JSON.stringify(app, null, 2) + '\n');

// 2) eas.json (how the cloud builds the app)
const eas = {
  cli: { version: '>= 5.0.0' },
  build: {
    preview: {
      distribution: 'internal',
      android: { buildType: 'apk' },
      env: { EXPO_PUBLIC_API_URL: api },
    },
    production: {
      env: { EXPO_PUBLIC_API_URL: api },
    },
  },
};
fs.writeFileSync(new URL('../eas.json', import.meta.url), JSON.stringify(eas, null, 2) + '\n');

console.log('Updated app.json and eas.json');
console.log(`  app id:  ${appId}`);
console.log(`  API:     ${api}`);
