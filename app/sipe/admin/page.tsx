"use client";

import Link from "next/link";
import AdminGate from "./admin-gate";

const menus = [
  {
    href: "/sipe/admin/photos",
    emoji: "🖼️",
    title: "사진 관리",
    description: "업로드된 사진을 확인하고 삭제합니다.",
  },
  {
    href: "/sipe/admin/photographers",
    emoji: "👤",
    title: "작가 관리",
    description: "작가 프로필을 등록하고 삭제합니다.",
  },
  {
    href: "/sipe/admin/albums",
    emoji: "📔",
    title: "앨범 관리",
    description: "출사 앨범을 만들고 수정·삭제합니다.",
  },
];

export default function AdminHubPage() {
  return (
    <AdminGate>
      {() => (
        <div className="mx-auto max-w-2xl py-8">
          <h1 className="text-2xl font-semibold">관리자</h1>
          <p className="mt-2 text-sm text-neutral-400">
            관리할 항목을 선택하세요.
          </p>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {menus.map((menu) => (
              <Link
                key={menu.href}
                href={menu.href}
                className="group rounded-2xl border border-white/10 bg-white/5 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-white/25 hover:shadow-xl hover:shadow-black/40"
              >
                <p className="text-3xl">{menu.emoji}</p>
                <p className="mt-3 font-semibold text-neutral-100">
                  {menu.title}
                  <span className="ml-1 inline-block transition-transform group-hover:translate-x-0.5">
                    →
                  </span>
                </p>
                <p className="mt-1 text-sm text-neutral-400">
                  {menu.description}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </AdminGate>
  );
}
