import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL('https://attendx-srm.vercel.app'),
  title: {
    default: "AttendX - Smart Attendance Tracking for SRM",
    template: "%s | AttendX"
  },
  description: "The ultimate attendance companion for SRMites. Track real-time attendance, calculate margins, predict grades, and manage your academic life effortlessly.",
  keywords: ["SRM Attendance", "AttendX", "SRMIST", "Academia", "Grade Predictor", "SRM Student Portal", "Attendance Tracker", "SRM Marks"],
  authors: [{ name: "AttendX Team" }],
  creator: "AttendX",
  openGraph: {
    title: "AttendX - Smart Attendance Tracking",
    description: "Track your SRM attendance in real-time. Calculate margins, predict grades, and never miss a crucial class again.",
    url: 'https://attendx-srm.vercel.app',
    siteName: 'AttendX',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: '/logo.png',
        width: 512,
        height: 512,
        alt: 'AttendX Logo',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: "AttendX - Smart Attendance Tracking",
    description: "Track your SRM attendance in real-time. Calculate margins and predict grades.",
    images: ['/logo.png'],
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "AttendX",
  },
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#5E6AD2",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="google-site-verification" content="Kz46BvEtPWBiVjAkkpu5kY3jIH83E4QQcARqwxwPxYs" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js')
                    .then(reg => console.log('SW registered'))
                    .catch(err => console.log('SW failed', err));
                });
              }
            `,
          }}
        />
      </head>
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
