import { Inter, JetBrains_Mono } from "next/font/google";
import "../design-system/tokens.css";
import "../design-system/components.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata = {
  title: "Cron Job Observatory",
  description: "Know the minute a cron job fails, not when customers tell you.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
