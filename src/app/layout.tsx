import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { adobeFontsKitStylesheet } from "@/lib/implementation-contract";

import "./globals.css";

export const metadata: Metadata = {
  title: "MOYOY",
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
    <html lang="ja">
      <head>
        {/* DA-ASSET-01 requires the two named source faces to be reproduced through web
            font delivery, and the source supplies the Adobe Fonts kit that serves them.
            The modern CSS embed replaces the source's script embed: same kit, one
            render-blocking stylesheet instead of a timed script, and no wf-* class
            juggling. The kit is domain-locked, so it only resolves once the deploy
            origin is registered in Adobe Fonts; until then the local subsets below keep
            rendering. See docs/open-questions.md Q-05. */}
        <link href="https://use.typekit.net/" rel="preconnect" />
        <link crossOrigin="anonymous" href="https://p.typekit.net/" rel="preconnect" />
        <link href={adobeFontsKitStylesheet} rel="stylesheet" />
        {/* One measured first-paint text face is preloaded; the Latin subset is small
            enough to arrive with the stylesheet request. */}
        <link
          as="font"
          crossOrigin="anonymous"
          href="/assets/moyoy-candidate/font/moyoy-noto-sans-jp-subset.woff2"
          rel="preload"
          type="font/woff2"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
