import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { S } from "@/lib/strings";
import "./globals.css";

export const metadata: Metadata = {
  title: S.appName,
  description: S.loginSubtitle,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="dark">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="min-h-screen antialiased">
        <TooltipProvider>
          {children}
          <Toaster theme="dark" position="bottom-center" />
        </TooltipProvider>
      </body>
    </html>
  );
}
