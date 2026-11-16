import './globals.css';
import { AuthProvider } from '../lib/auth';
import PinProvider from '../components/PinProvider';

export const metadata = {
  title: 'MultiWallet',
  description: 'Pay. Book. Order. One app. (Prototype: test money only)',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <PinProvider>{children}</PinProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
