import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro, Noto_Sans } from "next/font/google";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { APP_NAME } from "@/lib/config/env";
import "@/styles/globals.css";

const heading = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["500", "600", "700"],
  variable: "--font-be-vietnam-pro",
  display: "swap",
});

const body = Noto_Sans({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: `${APP_NAME} — Đặt tour miền Tây`, template: `%s | ${APP_NAME}` },
  description: "Đặt tour du lịch miền Tây và biển đảo phía Nam: chọn đợt khởi hành, giữ chỗ và thanh toán trực tuyến.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0369A1",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={`${heading.variable} ${body.variable}`}>
      <body className="min-h-dvh antialiased">
        <AuthProvider>
          <SiteHeader />
          <main id="main-content" tabIndex={-1} className="focus:outline-none">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
