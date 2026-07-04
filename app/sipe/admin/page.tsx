"use client";

import { useState } from "react";
import Link from "next/link";
import { getSupabaseAnon, photoPublicUrl, PHOTOS_BUCKET } from "@/lib/supabase";
import { cameraLabel, formatTakenAt } from "@/lib/format";
import type { Photo, Photographer } from "@/lib/types";

const inputCls =
  "w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm outline-none placeholder:text-neutral-500 focus:border-white/40";

function ProfileAvatar({
  photographer,
  size,
}: {
  photographer: Photographer;
  size: string;
}) {
  if (photographer.profile_image_path) {
    return (
      // 프로필 사진은 원형으로 통일해서 보여준다.
      <img
        src={photoPublicUrl(photographer.profile_image_path)}
        alt={photographer.name}
        loading="lazy"
        className={`${size} shrink-0 rounded-full border border-white/15 object-cover`}
      />
    );
  }
  return (
    <div
      className={`${size} flex shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/10 text-lg`}
    >
      📷
    </div>
  );
}

/** 사진사 등록/삭제 섹션 */
function PhotographerSection({
  adminKey,
  photographers,
  onChanged,
  onError,
}: {
  adminKey: string;
  photographers: Photographer[];
  onChanged: () => Promise<void>;
  onError: (message: string | null) => void;
}) {
  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [skills, setSkills] = useState("");
  const [snsUrl, setSnsUrl] = useState("");
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    onError(null);
    try {
      let profileImagePath: string | undefined;

      if (profileFile) {
        const urlRes = await fetch("/api/upload-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            adminKey,
            contentType: profileFile.type,
            kind: "profile",
          }),
        });
        const urlJson = await urlRes.json();
        if (!urlRes.ok) {
          throw new Error(urlJson.error ?? "프로필 이미지 업로드 URL 발급 실패");
        }
        const supabase = getSupabaseAnon();
        const { error: uploadError } = await supabase.storage
          .from(PHOTOS_BUCKET)
          .uploadToSignedUrl(urlJson.path, urlJson.token, profileFile);
        if (uploadError) {
          throw new Error(`프로필 이미지 업로드 실패: ${uploadError.message}`);
        }
        profileImagePath = urlJson.path;
      }

      const res = await fetch("/api/photographers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminKey,
          name,
          nickname,
          skills,
          snsUrl,
          profileImagePath,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "사진사 등록 실패");

      setName("");
      setNickname("");
      setSkills("");
      setSnsUrl("");
      setProfileFile(null);
      await onChanged();
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (photographer: Photographer) => {
    if (
      !window.confirm(
        `사진사 "${photographer.name}"을(를) 삭제할까요? 올린 사진은 남지만 연결이 해제됩니다.`
      )
    ) {
      return;
    }
    setDeletingId(photographer.id);
    onError(null);
    try {
      const res = await fetch(`/api/photographers/${photographer.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminKey }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "삭제 실패");
      await onChanged();
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">
        사진사 관리{" "}
        <span className="text-sm font-normal text-neutral-400">
          {photographers.length}명
        </span>
      </h2>

      {photographers.length > 0 && (
        <ul className="space-y-2">
          {photographers.map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-3"
            >
              <ProfileAvatar photographer={p} size="h-12 w-12" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-neutral-100">
                  {p.name}
                  {p.nickname && (
                    <span className="ml-1.5 text-sm text-neutral-400">
                      {p.nickname}
                    </span>
                  )}
                </p>
                <p className="mt-0.5 flex flex-wrap gap-x-2 truncate text-xs text-neutral-400">
                  {p.skills && <span>{p.skills}</span>}
                  {p.sns_url && (
                    <a
                      href={p.sns_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:underline"
                    >
                      SNS ↗
                    </a>
                  )}
                </p>
              </div>
              <button
                onClick={() => onDelete(p)}
                disabled={deletingId === p.id}
                className="shrink-0 rounded-full border border-red-500/40 px-4 py-1.5 text-sm text-red-300 hover:bg-red-500/10 disabled:opacity-40"
              >
                {deletingId === p.id ? "삭제 중..." : "삭제"}
              </button>
            </li>
          ))}
        </ul>
      )}

      <form
        onSubmit={onCreate}
        className="space-y-4 rounded-xl border border-white/10 bg-white/5 p-4"
      >
        <p className="text-sm font-medium text-neutral-200">새 사진사 등록</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="이름 *"
            className={inputCls}
          />
          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="닉네임"
            className={inputCls}
          />
        </div>
        <input
          value={skills}
          onChange={(e) => setSkills(e.target.value)}
          placeholder="주요 사용 기술 (예: 인물 스냅, 필름, 야경 장노출)"
          className={inputCls}
        />
        <input
          type="url"
          value={snsUrl}
          onChange={(e) => setSnsUrl(e.target.value)}
          placeholder="SNS 링크 (예: https://instagram.com/...)"
          className={inputCls}
        />
        <div>
          <label className="mb-1.5 block text-xs text-neutral-400">
            프로필 이미지 (선택)
          </label>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => setProfileFile(e.target.files?.[0] ?? null)}
            className="w-full text-sm text-neutral-300 file:mr-3 file:rounded-full file:border-0 file:bg-white file:px-4 file:py-1.5 file:text-sm file:font-medium file:text-black hover:file:bg-neutral-200"
          />
        </div>
        <button
          type="submit"
          disabled={saving || name.trim().length === 0}
          className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-black hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving ? "등록 중..." : "사진사 등록"}
        </button>
      </form>
    </section>
  );
}

export default function AdminPage() {
  const [adminKey, setAdminKey] = useState("");
  const [authed, setAuthed] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [photographers, setPhotographers] = useState<Photographer[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadAll = async () => {
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
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setVerifying(false);
    }
  };

  const onDeletePhoto = async (photo: Photo) => {
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

  if (!authed) {
    return (
      <div className="mx-auto max-w-sm py-16">
        <h1 className="text-2xl font-semibold">관리자 페이지</h1>
        <p className="mt-2 text-sm text-neutral-400">
          사진 업로드에 사용하는 관리자 키를 입력하면 사진과 사진사를 관리할 수
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
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">관리자</h1>
        <button
          onClick={loadAll}
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

      <PhotographerSection
        adminKey={adminKey}
        photographers={photographers}
        onChanged={loadAll}
        onError={setError}
      />

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">
          사진 관리{" "}
          <span className="text-sm font-normal text-neutral-400">
            {photos.length}장
          </span>
        </h2>

        {photos.length === 0 && !loading ? (
          <p className="py-8 text-center text-neutral-400">
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
                    onClick={() => onDeletePhoto(photo)}
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
      </section>
    </div>
  );
}
