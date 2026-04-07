import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'Translator',
  description: 'ဘာသာပြန်ဖို့ ခက်နေတဲ့ စာလေးတွေ ရှိလား? ကျွန်တော့်ဆီသာ ပို့လိုက်ပါ! ဘာစကားပလ္လင်မှ မခံဘဲ လိုချင်တဲ့ ဘာသာပြန်ချက်သက်သက်ကိုပဲ ချက်ချင်း တိုက်ရိုက် ဖော်ပြပေးသွားမှာပါ။',
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
