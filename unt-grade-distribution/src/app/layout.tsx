import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Navbar from "@/components/Navbar";
import Providers from "@/components/Providers";
import SeasonalBackground from "@/components/SeasonalBackground";
import KofiWidget from "@/components/KofiWidget";
import "@fontsource/manrope/400.css";
import "@fontsource/manrope/500.css";
import "@fontsource/manrope/600.css";
import "@fontsource/manrope/700.css";
import "@fontsource/manrope/800.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "UNT Grade Distribution",
  description:
    "Browse UNT course and instructor grade distributions. An independent student project.",
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
        className="font-sans antialiased bg-jungle-tan text-gray-900 transition-colors duration-700 dark:bg-ui-page dark:text-ui-text"
      >
        {/* Light mode gradient overlay — warm orange at bottom */}
        <div className="light-background pointer-events-none fixed inset-0 z-0 opacity-100 transition-opacity duration-700 dark:opacity-0" style={{ background: 'linear-gradient(to bottom, transparent 0%, rgba(210,140,70,0.18) 100%)' }} />
        {/* Falling leaves (light mode only) */}
        <SeasonalBackground />
        <Providers>
          <Navbar />
          <main className="relative z-20">
            {children}
          </main>
        </Providers>
        <KofiWidget />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
