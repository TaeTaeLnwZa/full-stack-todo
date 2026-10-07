import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Daymark — a calmer to-do list",
  description: "A simple, private place to keep track of what matters today.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
