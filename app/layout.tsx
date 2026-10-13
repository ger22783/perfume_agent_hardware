import './globals.css';
import './accounts.css';
import AccountExperience from '@/components/AccountExperience';
import LocaleProvider from '@/components/LocaleProvider';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Aromacell Formula Lab',
  description: 'Four-pump AI formula and colored-liquid blending demo by Westlake iGEM',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body><LocaleProvider><AccountExperience>{children}</AccountExperience></LocaleProvider></body>
    </html>
  );
}
