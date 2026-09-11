import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Command Center — Discord Suite",
  description: "Manage moderation, tickets, economy, leveling, security, and community activity.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">{children}</body>
    </html>
  );
}
