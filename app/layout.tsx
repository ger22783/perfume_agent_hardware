import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Aromacell Formula Lab',
  description: 'Four-pump AI formula and colored-liquid blending demo by Westlake iGEM',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
