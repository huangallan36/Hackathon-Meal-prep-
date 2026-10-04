import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, DM_Sans } from "next/font/google";
import { AppShell } from "@/components/shell/AppShell";
import "./globals.css";

/** Headings: Bricolage Grotesque SemiBold, -1.5% tracking (design rules v1: no serif fonts) */
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  axes: ["opsz", "wdth"],
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
    <html lang="en" className={`${bricolage.variable} ${dmSans.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
