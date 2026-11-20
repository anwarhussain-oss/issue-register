import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Issue Register",
  description: "Track, filter and manage issues.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
