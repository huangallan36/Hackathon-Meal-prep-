import type { Metadata, Viewport } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
import { AppShell } from "@/components/shell/AppShell";
import "./globals.css";

/** Headings: Fraunces with SOFT 0 / WONK 1 (set in globals.css on .font-display) */
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  axes: ["opsz", "SOFT", "WONK"],
});

/** Body: DM Sans at optical size 14 (set in globals.css on body) */
const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  axes: ["opsz"],
});

export const metadata: Metadata = {
  title: "Sous · your AI sous chef",
  description: "Talk to Sous: it checks your fridge, suggests recipes, walks you through cooking by voice and logs the meal.",
  applicationName: "Sous",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#fbf8f3",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${fraunces.variable} ${dmSans.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
