import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'Translate',
  description: 'ဘာသာ ပြန်ချင်ချင်တဲ့ စာရှိရင် ပို့လာခဲ့ပေးပါ။ အနီးစပ်ဆုံးနဲ့ အမှန်ကန်ဆုံး ဖြစ်အောင် ဘာသာ ပြန်ပေးပါမည်။',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
