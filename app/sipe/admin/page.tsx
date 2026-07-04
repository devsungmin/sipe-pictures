"use client";

import { useState } from "react";
import Link from "next/link";
import { getSupabaseAnon, photoPublicUrl } from "@/lib/supabase";
import { cameraLabel, formatTakenAt } from "@/lib/format";
import type { Photo } from "@/lib/types";

const inputCls =
  "w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm outline-none placeholder:text-neutral-500 focus:border-white/40";

export default function AdminPage() {
  const [adminKey, setAdminKey] = useState("");
  const [authed, setAuthed] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadPhotos = async () => {
    setLoadingPhotos(true);
    setError(null);
    try {
      const supabase = getSupabaseAnon();
      const { data, error: fetchError } = await supabase
        .from("photos")
        .select("*")
        .order("created_at", { ascending: false });
      if (fetchError) throw new Error(fetchError.message);
      setPhotos(data ?? []);
    } catch (e) {
      setError(
        `사진 목록을 불러오지 못했습니다: ${e instanceof Error ? e.message : String(e)}`
      );
    } finally {
      setLoadingPhotos(false);
    }
  };

  const onLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (verifying) return;
    setVerifying(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminKey }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "인증에 실패했습니다.");
      setAuthed(true);
      await loadPhotos();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setVerifying(false);
    }
  };

  const onDelete = async (photo: Photo) => {
    const label = photo.title ?? "무제";
    if (!window.confirm(`"${label}" 사진을 삭제할까요? 되돌릴 수 없습니다.`)) {
      return;
    }
    setDeletingId(photo.id);
    setError(null);
    try {
      const res = await fetch(`/api/photos/${photo.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminKey }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "삭제에 실패했습니다.");
      setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
    } catch (e) {
      setError(
        `삭제 실패: ${e instanceof Error ? e.message : String(e)}`
      );
    } finally {
      setDeletingId(null);
    }
  };

  if (!authed) {
    return (
      <div className="mx-auto max-w-sm py-16">
        <h1 className="text-2xl font-semibold">관리자 페이지</h1>
        <p className="mt-2 text-sm text-neutral-400">
          사진 업로드에 사용하는 관리자 키를 입력하면 업로드된 사진을 관리할 수
          있습니다.
        </p>
        <form onSubmit={onLogin} className="mt-8 space-y-4">
          <input
            type="password"
            required
            autoFocus
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
            placeholder="관리자 키"
            className={inputCls}
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={verifying || adminKey.length === 0}
            className="w-full rounded-full bg-white py-2.5 text-sm font-semibold text-black hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {verifying ? "확인 중..." : "입장"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">사진 관리</h1>
          <p className="mt-1 text-sm text-neutral-400">
            총 {photos.length}장의 사진이 업로드되어 있습니다.
          </p>
        </div>
        <button
          onClick={loadPhotos}
          disabled={loadingPhotos}
          className="rounded-full border border-white/20 px-4 py-1.5 text-sm text-neutral-300 hover:bg-white/10 disabled:opacity-40"
        >
          {loadingPhotos ? "불러오는 중..." : "새로고침"}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {photos.length === 0 && !loadingPhotos ? (
        <p className="py-16 text-center text-neutral-400">
          업로드된 사진이 없습니다.
        </p>
      ) : (
        <ul className="space-y-3">
          {photos.map((photo) => {
            const camera = cameraLabel(photo.camera_make, photo.camera_model);
            const takenAt = formatTakenAt(photo.taken_at);
            return (
              <li
                key={photo.id}
                className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-3"
              >
                {/* Vercel 이미지 최적화 무료 한도를 아끼기 위해 next/image 대신 img 사용 */}
                <img
                  src={photoPublicUrl(photo.storage_path)}
                  alt={photo.title ?? "SIPE 출사 사진"}
                  loading="lazy"
                  className="h-20 w-20 shrink-0 rounded-lg object-cover"
                />
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/photos/${photo.id}`}
                    className="block truncate font-medium text-neutral-100 hover:underline"
                  >
                    {photo.title ?? "무제"}
                  </Link>
                  <p className="mt-1 flex flex-wrap gap-x-2 text-xs text-neutral-400">
                    {photo.uploader && <span>{photo.uploader}</span>}
                    {camera && <span>{camera}</span>}
                    {takenAt && <span>{takenAt}</span>}
                    {photo.latitude != null && photo.longitude != null && (
                      <span>📍 위치 정보</span>
                    )}
                  </p>
                </div>
                <button
                  onClick={() => onDelete(photo)}
                  disabled={deletingId === photo.id}
                  className="shrink-0 rounded-full border border-red-500/40 px-4 py-1.5 text-sm text-red-300 hover:bg-red-500/10 disabled:opacity-40"
                >
                  {deletingId === photo.id ? "삭제 중..." : "삭제"}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
