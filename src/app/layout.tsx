import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Toaster } from "sonner";

import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "One OS · Onevision1ture",
    template: "%s · One OS",
  },
  description:
    "Sistema de gestão da Onevision1ture: clientes, CRM, equipe, financeiro, contratos e arquivos.",
  applicationName: "One OS",
};

export const viewport: Viewport = {
  themeColor: "#07080b",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${inter.variable} ${mono.variable} antialiased`}>
        <ThemeProvider>
          {children}
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: "var(--surface-3)",
                border: "1px solid var(--border-strong)",
                color: "var(--text-primary)",
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
