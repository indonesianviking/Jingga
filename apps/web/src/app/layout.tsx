import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';

export const metadata: Metadata = {
  title: 'Jingga | Publication & Royalty Platform',
  description:
    'A publication and royalty platform for independent writers, researchers, and creators. Built on Stellar.',
  icons: {
    icon: 'https://raw.githubusercontent.com/indonesianviking/jingga-assets/5f7863473422acb201182da120e33eee16beb4c4/logo-jingga.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
