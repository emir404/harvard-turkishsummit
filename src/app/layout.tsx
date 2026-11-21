import type { Metadata, Viewport } from "next";
import { Inter_Tight } from "next/font/google";
import "./globals.css";

const interTight = Inter_Tight({
  subsets: ["latin", "latin-ext"],
  variable: "--font-inter-tight",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Harvard Türkiye Summit 2027",
    template: "%s · Harvard Türkiye Summit 2027",
  },
  description:
    "Türkiye Beyond the Crossroads: From Regional Power to Global Force. A student-led summit at Harvard on Saturday, May 1, 2027, at the David Rubenstein Treehouse.",
};

export const viewport: Viewport = {
  themeColor: "#0e0e10",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={interTight.variable}>
      <body>{children}</body>
    </html>
  );
}
