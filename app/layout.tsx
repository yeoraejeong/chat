import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Solve Bot",
  description: "수학, 화학, 생명 문제 풀이 챗봇",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="bg-gray-50 text-gray-900 antialiased">
        <header className="p-4 shadow bg-white">
          <h1 className="text-xl font-bold text-center">AI Solve Bot</h1>
        </header>
        <main className="p-4">{children}</main>
      </body>
    </html>
  );
}
