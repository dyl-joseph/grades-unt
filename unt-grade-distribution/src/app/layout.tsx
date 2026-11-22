import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Navbar from "@/components/Navbar";
import Providers from "@/components/Providers";
import FallingLeaves from "@/components/FallingLeaves";
import Starfield from "@/components/Starfield";
import KofiWidget from "@/components/KofiWidget";
import { HOME_DESCRIPTION, HOME_TITLE, SITE_NAME, SITE_URL } from "@/lib/seo";
import "./globals.css";

// Defaults only. Each page sets its own title, description, canonical, and Open Graph tags.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: HOME_TITLE,
  description: HOME_DESCRIPTION,
  openGraph: { siteName: SITE_NAME, type: "website" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Prevent flash of wrong theme */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  document.documentElement.classList.toggle(
                    'dark',
                    window.matchMedia('(prefers-color-scheme: dark)').matches
                  );
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body
        className="font-sans antialiased bg-ui-page text-ui-text"
      >
        {/* Ambient backgrounds: leaves in light mode, stars in dark mode */}
        <FallingLeaves />
        <Starfield />
        <Providers>
          <Navbar />
          <main className="relative z-20">{children}</main>
        </Providers>
        <KofiWidget />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
