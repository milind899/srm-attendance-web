import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SRM Attendance Tracker",
  description: "Track your attendance for ENT and FSH departments",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
