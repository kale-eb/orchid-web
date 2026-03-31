import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Orchid — Set My Wallpaper",
  description: "Create a wallpaper and send it straight to my phone!",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
