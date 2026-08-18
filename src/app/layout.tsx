import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: "Implementation foundation",
  description:
    "Internal implementation foundation. Production content is not configured.",
  robots: {
    follow: false,
    index: false,
  },
};

export const viewport: Viewport = {
  colorScheme: "light",
  initialScale: 1,
  viewportFit: "cover",
  width: "device-width",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
