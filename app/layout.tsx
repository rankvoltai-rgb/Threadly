import type { Metadata, Viewport } from "next";
import { Poppins, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import ConvexClientProvider from "@/components/ConvexClientProvider";

// Semibold and bold only — every weight in the UI resolves to one of these two.
const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["600", "700"],
});
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

const SITE = "https://getthreadly.vercel.app";
const TITLE = "Threadly — Turn IG Thread into Revenue";
const DESCRIPTION =
  "Find people on Threads asking for what you sell, ranked newest first. Paste your website and Threadly works out the keywords. 10 free leads, no signup — then $20 once, yours for life.";

export const metadata: Metadata = {
  // Makes the opengraph-image / twitter-image files resolve to absolute URLs,
  // which every social scraper requires.
  metadataBase: new URL(SITE),
  title: TITLE,
  description: DESCRIPTION,
  applicationName: "Threadly",
  openGraph: {
    type: "website",
    url: SITE,
    siteName: "Threadly",
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
  robots: { index: true, follow: true },
};

/** Forced black: browser chrome and form controls follow the page. */
export const viewport: Viewport = {
  themeColor: "#000000",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <ConvexAuthNextjsServerProvider>
      <html
        lang="en"
        className={`${poppins.variable} ${geistMono.variable} h-full antialiased`}
      >
        <body className="min-h-full flex flex-col">
          <ConvexClientProvider>{children}</ConvexClientProvider>
        </body>
      </html>
    </ConvexAuthNextjsServerProvider>
  );
}
