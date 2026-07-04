import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "SIPE Pictures",
  description: "SIPE 출사 모임의 사진을 공유하는 갤러리",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <header className="sticky top-0 z-10 border-b border-white/10 bg-[#0c0c0e]/80 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
            <Link href="/" className="text-lg font-semibold tracking-tight">
              📷 SIPE Pictures
            </Link>
            <nav className="flex items-center gap-4 text-sm text-neutral-300">
              <Link href="/" className="hover:text-white">
                갤러리
              </Link>
              <Link href="/map" className="hover:text-white">
                지도
              </Link>
              <Link href="/photographers" className="hover:text-white">
                작가
              </Link>
              <Link
                href="/upload"
                className="rounded-full bg-white px-4 py-1.5 font-medium text-black hover:bg-neutral-200"
              >
                업로드
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
          {children}
        </main>
        <footer className="border-t border-white/10 py-6 text-center text-xs text-neutral-500">
          SIPE 출사 모임 · sipe-pictures
        </footer>
      </body>
    </html>
  );
}
