import type { Metadata } from "next";
import { Bricolage_Grotesque, Figtree } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Navbar from "@/components/Navbar";
import Providers from "@/components/Providers";
import FallingLeaves from "@/components/FallingLeaves";
import Starfield from "@/components/Starfield";
import KofiWidget from "@/components/KofiWidget";
import "./globals.css";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "swap",
});

const body = Figtree({
  subsets: ["latin"],
  variable: "--font-figtree",
  display: "swap",
});

export const metadata: Metadata = {
  title: "UNT Grade Distribution",
  description:
    "Explore grade distributions for courses and professors at the University of North Texas.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`} suppressHydrationWarning>
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
