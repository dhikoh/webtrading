import '@/styles/globals.css';

export const metadata = {
  title: 'TradeMachine - AI Futures Trading Analyzer',
  description: 'AI-assisted technical analysis, risk calibration, and manual trade journaling system.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>
        {children}
      </body>
    </html>
  );
}
