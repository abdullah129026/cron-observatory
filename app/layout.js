import { Inter, JetBrains_Mono } from "next/font/google";
import "../design-system/tokens.css";
import "../design-system/components.css";
import "./layout.css";
import ToastStack from "../components/Toasts.js";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata = {
  metadataBase: new URL("https://cron-observatory.vercel.app"),
  title: "Cron Job Observatory",
  description: "Know the minute a cron job fails, not when customers tell you.",
  openGraph: {
    title: "Cron Job Observatory",
    description: "Know the minute a cron job fails, not when customers tell you.",
    url: "https://cron-observatory.vercel.app",
    siteName: "Cron Job Observatory",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Cron Job Observatory: know the minute a cron job fails." }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Cron Job Observatory",
    description: "Know the minute a cron job fails, not when customers tell you.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable}`}>
      <body>
        {children}
        <ToastStack />
      </body>
    </html>
  );
}
