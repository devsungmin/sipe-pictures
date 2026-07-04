"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AdminGate from "../admin-gate";
import { getSupabaseAnon, photoPublicUrl } from "@/lib/supabase";
import { cameraLabel, formatTakenAt } from "@/lib/format";
import type { Photo, Photographer } from "@/lib/types";

const inputCls =
  "w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm outline-none placeholder:text-neutral-500 focus:border-white/40";

/** 사진 한 장의 인라인 수정 폼 */
function PhotoEditForm({
  adminKey,
  photo,
  photographers,
  onSaved,
  onCancel,
  onError,
}: {
  adminKey: string;
  photo: Photo;
  photographers: Photographer[];
  onSaved: () => Promise<void>;
  onCancel: () => void;
  onError: (message: string | null) => void;
}) {
  const [title, setTitle] = useState(photo.title ?? "");
  const [description, setDescription] = useState(photo.description ?? "");
  const [photographerId, setPhotographerId] = useState(
    photo.photographer_id ?? ""
  );
  const [saving, setSaving] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    onError(null);
    try {
      const res = await fetch(`/api/photos/${photo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminKey,
          title,
          description,
          photographerId: photographerId || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "사진 수정 실패");
      await onSaved();
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="mt-3 space-y-3 border-t border-white/10 pt-3">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="제목"
        className={inputCls}
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={2}
        placeholder="설명"
        className={inputCls}
      />
      <select
        value={photographerId}
        onChange={(e) => setPhotographerId(e.target.value)}
        className={`${inputCls} [&>option]:bg-neutral-900`}
      >
        <option value="">사진사 미지정</option>
        {photographers.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
            {p.nickname ? ` (${p.nickname})` : ""}
          </option>
        ))}
      </select>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-black hover:bg-neutral-200 disabled:opacity-40"
        >
          {saving ? "저장 중..." : "저장"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-white/20 px-4 py-1.5 text-sm text-neutral-300 hover:bg-white/10"
        >
          취소
        </button>
      </div>
    </form>
  );
}

function PhotoManager({ adminKey }: { adminKey: string }) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [photographers, setPhotographers] = useState<Photographer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = getSupabaseAnon();
      const [photosRes, photographersRes] = await Promise.all([
        supabase
          .from("photos")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase.from("photographers").select("*").order("name"),
      ]);
      if (photosRes.error) throw new Error(photosRes.error.message);
      if (photographersRes.error) {
        throw new Error(photographersRes.error.message);
      }
      setPhotos(photosRes.data ?? []);
      setPhotographers(photographersRes.data ?? []);
    } catch (e) {
      setError(
        `목록을 불러오지 못했습니다: ${e instanceof Error ? e.message : String(e)}`
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 동기 setState 경고(react-hooks/set-state-in-effect)를 피하기 위해 다음 틱에 로드한다.
    const id = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(id);
     
  }, []);

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
      setError(`삭제 실패: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <Link
        href="/sipe/admin"
        className="inline-flex items-center gap-1 text-sm text-neutral-400 hover:text-white"
      >
        ← 관리자 홈
      </Link>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          사진 관리{" "}
          <span className="text-sm font-normal text-neutral-400">
            {photos.length}장
          </span>
        </h1>
        <button
          onClick={load}
          disabled={loading}
          className="rounded-full border border-white/20 px-4 py-1.5 text-sm text-neutral-300 hover:bg-white/10 disabled:opacity-40"
        >
          {loading ? "불러오는 중..." : "새로고침"}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {photos.length === 0 && !loading ? (
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
                className={`rounded-xl border bg-white/5 p-3 ${
                  editingId === photo.id ? "border-white/40" : "border-white/10"
                }`}
              >
                <div className="flex items-center gap-4">
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
                    onClick={() =>
                      setEditingId(editingId === photo.id ? null : photo.id)
                    }
                    className="shrink-0 rounded-full border border-white/20 px-4 py-1.5 text-sm text-neutral-300 hover:bg-white/10"
                  >
                    {editingId === photo.id ? "닫기" : "수정"}
                  </button>
                  <button
                    onClick={() => onDelete(photo)}
                    disabled={deletingId === photo.id}
                    className="shrink-0 rounded-full border border-red-500/40 px-4 py-1.5 text-sm text-red-300 hover:bg-red-500/10 disabled:opacity-40"
                  >
                    {deletingId === photo.id ? "삭제 중..." : "삭제"}
                  </button>
                </div>
                {editingId === photo.id && (
                  <PhotoEditForm
                    adminKey={adminKey}
                    photo={photo}
                    photographers={photographers}
                    onSaved={async () => {
                      setEditingId(null);
                      await load();
                    }}
                    onCancel={() => setEditingId(null)}
                    onError={setError}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default function AdminPhotosPage() {
  return (
    <AdminGate>{(adminKey) => <PhotoManager adminKey={adminKey} />}</AdminGate>
  );
}
