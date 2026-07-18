"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AdminGate from "../admin-gate";
import { getSupabaseAnon } from "@/lib/supabase";
import type { Album } from "@/lib/types";

const inputCls =
  "w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm outline-none placeholder:text-neutral-500 focus:border-white/40";

type AlbumWithCount = Album & { photos: { count: number }[] };

function AlbumManager({ adminKey }: { adminKey: string }) {
  const [albums, setAlbums] = useState<AlbumWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // 폼 상태 (editingId가 있으면 수정 모드)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [saving, setSaving] = useState(false);

  const editing = editingId
    ? (albums.find((a) => a.id === editingId) ?? null)
    : null;

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = getSupabaseAnon();
      const { data, error: fetchError } = await supabase
        .from("albums")
        .select("*, photos(count)")
        .order("event_date", { ascending: false, nullsFirst: false });
      if (fetchError) throw new Error(fetchError.message);
      setAlbums((data ?? []) as AlbumWithCount[]);
    } catch (e) {
      setError(
        `앨범 목록을 불러오지 못했습니다: ${e instanceof Error ? e.message : String(e)}`
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

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setDescription("");
    setEventDate("");
  };

  const startEdit = (album: Album) => {
    setEditingId(album.id);
    setName(album.name);
    setDescription(album.description ?? "");
    setEventDate(album.event_date ?? "");
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(
        editingId ? `/api/albums/${editingId}` : "/api/albums",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            adminKey,
            name,
            description,
            eventDate: eventDate || undefined,
          }),
        }
      );
      const json = await res.json();
      if (!res.ok) {
        throw new Error(
          json.error ?? (editingId ? "앨범 수정 실패" : "앨범 생성 실패")
        );
      }
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (album: AlbumWithCount) => {
    if (
      !window.confirm(
        `앨범 "${album.name}"을(를) 삭제할까요? 사진은 남지만 앨범 연결이 해제됩니다.`
      )
    ) {
      return;
    }
    setDeletingId(album.id);
    setError(null);
    try {
      const res = await fetch(`/api/albums/${album.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminKey }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "삭제 실패");
      if (editingId === album.id) resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
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
          앨범 관리{" "}
          <span className="text-sm font-normal text-neutral-400">
            {albums.length}개
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

      {albums.length > 0 && (
        <ul className="space-y-2">
          {albums.map((album) => (
            <li
              key={album.id}
              className={`flex items-center gap-4 rounded-xl border bg-white/5 p-3 ${
                editingId === album.id ? "border-white/40" : "border-white/10"
              }`}
            >
              <div className="min-w-0 flex-1">
                <Link
                  href={`/albums/${album.id}`}
                  className="truncate font-medium text-neutral-100 hover:underline"
                >
                  {album.name}
                </Link>
                <p className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-neutral-400">
                  {album.event_date && <span>{album.event_date}</span>}
                  <span>사진 {album.photos[0]?.count ?? 0}장</span>
                </p>
              </div>
              <button
                onClick={() => startEdit(album)}
                className="shrink-0 rounded-full border border-white/20 px-4 py-1.5 text-sm text-neutral-300 hover:bg-white/10"
              >
                수정
              </button>
              <button
                onClick={() => onDelete(album)}
                disabled={deletingId === album.id}
                className="shrink-0 rounded-full border border-red-500/40 px-4 py-1.5 text-sm text-red-300 hover:bg-red-500/10 disabled:opacity-40"
              >
                {deletingId === album.id ? "삭제 중..." : "삭제"}
              </button>
            </li>
          ))}
        </ul>
      )}

      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded-xl border border-white/10 bg-white/5 p-4"
      >
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-neutral-200">
            {editing ? `"${editing.name}" 수정` : "새 앨범 만들기"}
          </p>
          {editing && (
            <button
              type="button"
              onClick={resetForm}
              className="text-xs text-neutral-400 hover:text-white"
            >
              수정 취소
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="앨범 이름 * (예: 5월 성수동 출사)"
            className={inputCls}
          />
          <input
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            className={inputCls}
          />
        </div>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="설명 (선택)"
          className={inputCls}
        />
        <button
          type="submit"
          disabled={saving || name.trim().length === 0}
          className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-black hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving ? "저장 중..." : editing ? "수정 저장" : "앨범 만들기"}
        </button>
      </form>
    </div>
  );
}

export default function AdminAlbumsPage() {
  return (
    <AdminGate>{(adminKey) => <AlbumManager adminKey={adminKey} />}</AdminGate>
  );
}
