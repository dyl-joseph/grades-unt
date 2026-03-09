import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Navbar from "@/components/Navbar";
import Providers from "@/components/Providers";
import Stars from "@/components/Stars";
import FallingLeaves from "@/components/FallingLeaves";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
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
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Prevent flash of wrong theme */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  if (theme === 'dark') {
                    document.documentElement.classList.add('dark');
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${inter.variable} font-sans antialiased bg-jungle-tan text-gray-900 transition-colors duration-700 dark:bg-black dark:text-green-100`}
      >
        {/* Dark mode gradient overlay */}
        <div className="pointer-events-none fixed inset-0 z-0 opacity-0 transition-opacity duration-700 dark:opacity-100" style={{ background: 'linear-gradient(to top, rgba(10,47,17,0.6) 0%, rgba(0,0,0,0.95) 100%)' }} />
        {/* Light mode gradient overlay — warm orange at bottom */}
        <div className="pointer-events-none fixed inset-0 z-0 opacity-100 transition-opacity duration-700 dark:opacity-0" style={{ background: 'linear-gradient(to bottom, transparent 0%, rgba(210,140,70,0.18) 100%)' }} />
        {/* Faint twinkling stars (dark mode only) */}
        <Stars />
        {/* Falling leaves (light mode only) */}
        <FallingLeaves />
        <Providers>
          <Navbar />
          <main className="relative z-20">{children}</main>
        </Providers>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
