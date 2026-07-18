"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AdminGate from "../admin-gate";
import { getSupabaseAnon, photoThumbUrl } from "@/lib/supabase";
import { cameraLabel, formatTakenAt } from "@/lib/format";
import type { Album, Photo, Photographer } from "@/lib/types";
import LocationPicker, {
  type PickedLocation,
} from "@/app/upload/location-picker";

const inputCls =
  "w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm outline-none placeholder:text-neutral-500 focus:border-white/40";

/** 사진 한 장의 인라인 수정 폼 */
function PhotoEditForm({
  adminKey,
  photo,
  photographers,
  albums,
  onSaved,
  onCancel,
  onError,
}: {
  adminKey: string;
  photo: Photo;
  photographers: Photographer[];
  albums: Album[];
  onSaved: () => Promise<void>;
  onCancel: () => void;
  onError: (message: string | null) => void;
}) {
  const [title, setTitle] = useState(photo.title ?? "");
  const [description, setDescription] = useState(photo.description ?? "");
  const [photographerId, setPhotographerId] = useState(
    photo.photographer_id ?? ""
  );
  const [albumId, setAlbumId] = useState(photo.album_id ?? "");
  const [location, setLocation] = useState<PickedLocation | null>(
    photo.latitude != null && photo.longitude != null
      ? { lat: photo.latitude, lng: photo.longitude }
      : null
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
          albumId: albumId || null,
          latitude: location?.lat ?? null,
          longitude: location?.lng ?? null,
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
        <option value="">작가 미지정</option>
        {photographers.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
            {p.nickname ? ` (${p.nickname})` : ""}
          </option>
        ))}
      </select>
      <select
        value={albumId}
        onChange={(e) => setAlbumId(e.target.value)}
        className={`${inputCls} [&>option]:bg-neutral-900`}
      >
        <option value="">앨범 없음</option>
        {albums.map((album) => (
          <option key={album.id} value={album.id}>
            {album.name}
            {album.event_date ? ` (${album.event_date})` : ""}
          </option>
        ))}
      </select>
      <div>
        <p className="mb-2 text-xs text-neutral-500">
          촬영 위치 — 지도를 클릭해 지정하거나 변경할 수 있어요.
        </p>
        <LocationPicker value={location} onChange={setLocation} />
        {location && (
          <p className="mt-2 flex items-center gap-3 text-xs text-neutral-400">
            선택된 위치: {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
            <button
              type="button"
              onClick={() => setLocation(null)}
              className="text-red-300 hover:underline"
            >
              위치 제거
            </button>
          </p>
        )}
      </div>
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
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  // 작가별 필터: "" = 전체, "none" = 작가 미지정, 그 외 = 작가 id
  const [photographerFilter, setPhotographerFilter] = useState("");

  const filteredPhotos = photos.filter((photo) => {
    if (photographerFilter === "") return true;
    if (photographerFilter === "none") return photo.photographer_id === null;
    return photo.photographer_id === photographerFilter;
  });

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = getSupabaseAnon();
      const [photosRes, photographersRes, albumsRes] = await Promise.all([
        supabase
          .from("photos")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase.from("photographers").select("*").order("name"),
        supabase
          .from("albums")
          .select("*")
          .order("event_date", { ascending: false, nullsFirst: false }),
      ]);
      if (photosRes.error) throw new Error(photosRes.error.message);
      if (photographersRes.error) {
        throw new Error(photographersRes.error.message);
      }
      if (albumsRes.error) throw new Error(albumsRes.error.message);
      setPhotos(photosRes.data ?? []);
      setPhotographers(photographersRes.data ?? []);
      setAlbums(albumsRes.data ?? []);
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
            {photographerFilter === ""
              ? `${photos.length}장`
              : `${filteredPhotos.length}장 / 전체 ${photos.length}장`}
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

      <div className="flex items-center gap-2">
        <label className="shrink-0 text-sm text-neutral-400">작가 필터</label>
        <select
          value={photographerFilter}
          onChange={(e) => setPhotographerFilter(e.target.value)}
          className={`${inputCls} max-w-60 [&>option]:bg-neutral-900`}
        >
          <option value="">전체 작가</option>
          <option value="none">작가 미지정</option>
          {photographers.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
              {p.nickname ? ` (${p.nickname})` : ""}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {filteredPhotos.length === 0 && !loading ? (
        <p className="py-16 text-center text-neutral-400">
          {photos.length === 0
            ? "업로드된 사진이 없습니다."
            : "이 작가의 사진이 없습니다."}
        </p>
      ) : (
        <ul className="space-y-3">
          {filteredPhotos.map((photo) => {
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
                    src={photoThumbUrl(photo)}
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
                    albums={albums}
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
