import './globals.css';
import { AuthProvider } from '../lib/auth';

export const metadata = {
  title: 'MultiWallet',
  description: 'Pay. Book. Order. One app. (Prototype: test money only)',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
