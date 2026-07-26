import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Archivo, Inter, Bricolage_Grotesque } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { ToastProvider } from "@/components/providers/ToastProvider";
import { GuestProvider } from "@/components/providers/GuestProvider";

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-archivo",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// Distinctive wordmark face for the flikpik logo.
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-logo",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "flikpik — stop arguing, start watching",
    template: "%s · flikpik",
  },
  description:
    "flikpik is a group movie decision app. Add movies, swipe together, watch the winner. No more 40-minute debates about what to watch.",
  openGraph: {
    title: "flikpik — stop arguing, start watching",
    description:
      "Everyone votes. One movie wins. That's it. flikpik ends movie-night debates.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${inter.variable} ${bricolage.variable}`}
    >
      <body className="grain min-h-screen">
        <SessionProvider>
          <GuestProvider>
            <ToastProvider>{children}</ToastProvider>
          </GuestProvider>
        </SessionProvider>
        <Analytics />
      </body>
    </html>
  );
}
