import type { Metadata, Viewport } from "next";
import { Poppins, Geist_Mono } from "next/font/google";
import "./globals.css";

// Semibold and bold only — every weight in the UI resolves to one of these two.
const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["600", "700"],
});
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Threadly — Find buyers on Threads before anyone else",
  description:
    "Search Threads by keyword and get the freshest posts from people actively asking for what you sell. 10 free leads, then $20 for life.",
};

/** Forced black: browser chrome and form controls follow the page. */
export const viewport: Viewport = {
  themeColor: "#000000",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${poppins.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
