"use client";

import { useEffect, useState } from "react";
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

const STORAGE_LIMIT_BYTES = 1024 ** 3; // Supabase Free 티어 1GB

interface StorageInfo {
  totalBytes: number;
  fileCount: number;
  orphanCount: number;
  orphanBytes: number;
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)}GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)}MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${bytes}B`;
}

/** Storage 사용량 표시 + 고아 파일 정리 */
function StorageSection({ adminKey }: { adminKey: string }) {
  const [info, setInfo] = useState<StorageInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [cleaning, setCleaning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const scan = async (action?: "cleanup") => {
    if (action === "cleanup") {
      setCleaning(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const res = await fetch("/api/admin/storage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminKey, action }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Storage 조회 실패");
      setInfo(json);
      if (action === "cleanup") {
        setMessage(
          json.removedCount > 0
            ? `고아 파일 ${json.removedCount}개(${formatBytes(json.removedBytes)})를 정리했습니다.`
            : "정리할 고아 파일이 없습니다."
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
      setCleaning(false);
    }
  };

  useEffect(() => {
    // 동기 setState 경고(react-hooks/set-state-in-effect)를 피하기 위해 다음 틱에 로드한다.
    const id = window.setTimeout(() => {
      void scan();
    }, 0);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onCleanup = () => {
    if (!info || info.orphanCount === 0 || cleaning) return;
    if (
      !window.confirm(
        `DB가 참조하지 않는 고아 파일 ${info.orphanCount}개(${formatBytes(info.orphanBytes)})를 삭제할까요? 되돌릴 수 없습니다.`
      )
    ) {
      return;
    }
    void scan("cleanup");
  };

  const usedRatio = info
    ? Math.min(1, info.totalBytes / STORAGE_LIMIT_BYTES)
    : 0;

  return (
    <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-neutral-100">💾 Storage 사용량</p>
        <button
          onClick={() => void scan()}
          disabled={loading || cleaning}
          className="text-xs text-neutral-400 hover:text-white disabled:opacity-40"
        >
          {loading ? "확인 중..." : "새로고침"}
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      {info && (
        <>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className={`h-full rounded-full ${
                usedRatio > 0.9
                  ? "bg-red-400"
                  : usedRatio > 0.7
                    ? "bg-amber-400"
                    : "bg-white"
              }`}
              style={{ width: `${Math.max(1, usedRatio * 100)}%` }}
            />
          </div>
          <p className="mt-2 text-sm text-neutral-300">
            {formatBytes(info.totalBytes)} / 1GB 사용 중 · 파일{" "}
            {info.fileCount}개
          </p>
          {info.orphanCount > 0 ? (
            <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-200">
              <span>
                DB가 참조하지 않는 고아 파일 {info.orphanCount}개(
                {formatBytes(info.orphanBytes)})가 있어요.
              </span>
              <button
                onClick={onCleanup}
                disabled={cleaning}
                className="rounded-full border border-amber-300/40 px-3 py-1 text-xs hover:bg-amber-500/20 disabled:opacity-40"
              >
                {cleaning ? "정리 중..." : "정리하기"}
              </button>
            </div>
          ) : (
            message && (
              <p className="mt-3 text-sm text-green-300">{message}</p>
            )
          )}
        </>
      )}
    </div>
  );
}

export default function AdminHubPage() {
  return (
    <AdminGate>
      {(adminKey) => (
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
          <StorageSection adminKey={adminKey} />
        </div>
      )}
    </AdminGate>
  );
}
