import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import Navbar from "@/components/Navbar";
import Providers from "@/components/Providers";
import Stars from "@/components/Stars";
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
        className={`${inter.variable} font-sans antialiased bg-jungle-tan text-gray-900 transition-colors duration-200 dark:bg-black dark:text-green-100`}
      >
        {/* Dark mode gradient overlay */}
        <div className="pointer-events-none fixed inset-0 z-0 hidden dark:block" style={{ background: 'linear-gradient(to top, rgba(10,47,17,0.6) 0%, rgba(0,0,0,0.95) 100%)' }} />
        {/* Faint twinkling stars (dark mode only) */}
        <Stars />
        <Providers>
          <Navbar />
          <main className="relative z-20">{children}</main>
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}
