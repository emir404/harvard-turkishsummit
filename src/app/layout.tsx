import { Agentation } from "agentation";
import type { Metadata, Viewport } from "next";
import { Hanken_Grotesk } from "next/font/google";
import "./globals.css";

const hankenGrotesk = Hanken_Grotesk({
  subsets: ["latin", "latin-ext"],
  variable: "--font-hanken-grotesk",
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
  themeColor: "#0c0c0c",
  colorScheme: "dark",
};

// Runs before first paint: content that reveals on scroll is hidden only when
// JavaScript is running. If the page's motion runtime has not started a few
// seconds later (a script failed, a slow network), everything is shown as it is.
const revealGate = `(function(){var d=document.documentElement;d.classList.add("js");setTimeout(function(){if(!d.hasAttribute("data-motion"))d.classList.remove("js")},4000)})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // data-scroll-behavior: Next turns smooth scrolling off for page changes, so only in-page links glide.
    <html lang="en" className={hankenGrotesk.variable} data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: revealGate }} />
      </head>
      <body>
        {children}
        {process.env.NODE_ENV === "development" && <Agentation />}
      </body>
    </html>
  );
}
