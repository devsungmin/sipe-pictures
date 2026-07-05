"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Cropper, { type Area } from "react-easy-crop";
import AdminGate from "../admin-gate";
import { getSupabaseAnon, photoPublicUrl, PHOTOS_BUCKET } from "@/lib/supabase";
import type { Photographer } from "@/lib/types";

const inputCls =
  "w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm outline-none placeholder:text-neutral-500 focus:border-white/40";

/** 선택한 크롭 영역을 512x512 JPEG 파일로 만든다. */
async function cropToSquareJpeg(file: File, area: Area): Promise<File> {
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("이미지를 불러올 수 없습니다."));
      img.src = url;
    });
    const SIZE = 512;
    const canvas = document.createElement("canvas");
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("이 브라우저에서는 이미지를 자를 수 없습니다.");
    ctx.drawImage(
      image,
      area.x,
      area.y,
      area.width,
      area.height,
      0,
      0,
      SIZE,
      SIZE
    );
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.9)
    );
    if (!blob) throw new Error("이미지 변환에 실패했습니다.");
    return new File([blob], "profile.jpg", { type: "image/jpeg" });
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** 프로필 이미지에서 원형으로 보여질 영역을 선택하는 크롭 UI */
function ProfileImageCropper({
  file,
  onCropComplete,
}: {
  file: File;
  onCropComplete: (area: Area) => void;
}) {
  // 파일이 바뀌면 부모가 key로 재마운트하므로 crop/zoom은 초기값으로 시작한다.
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const previewUrl = useMemo(() => URL.createObjectURL(file), [file]);

  useEffect(() => {
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  return (
    <div className="space-y-2">
      <div className="relative h-64 w-full overflow-hidden rounded-lg bg-black">
        <Cropper
          image={previewUrl}
          crop={crop}
          zoom={zoom}
          aspect={1}
          cropShape="round"
          showGrid={false}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={(_, areaPixels) => onCropComplete(areaPixels)}
        />
      </div>
      <div className="flex items-center gap-3 text-xs text-neutral-400">
        <span className="shrink-0">확대</span>
        <input
          type="range"
          min={1}
          max={3}
          step={0.05}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="w-full accent-white"
        />
      </div>
      <p className="text-xs text-neutral-500">
        드래그와 확대로 원 안에 보여질 영역을 맞춰 주세요.
      </p>
    </div>
  );
}

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

function PhotographerManager({ adminKey }: { adminKey: string }) {
  const [photographers, setPhotographers] = useState<Photographer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // 폼 상태 (editingId가 있으면 수정 모드)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [skills, setSkills] = useState("");
  const [snsUrl, setSnsUrl] = useState("");
  const [email, setEmail] = useState("");
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);

  const editing = editingId
    ? (photographers.find((p) => p.id === editingId) ?? null)
    : null;

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = getSupabaseAnon();
      const { data, error: fetchError } = await supabase
        .from("photographers")
        .select("*")
        .order("name");
      if (fetchError) throw new Error(fetchError.message);
      setPhotographers(data ?? []);
    } catch (e) {
      setError(
        `작가 목록을 불러오지 못했습니다: ${e instanceof Error ? e.message : String(e)}`
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
    setNickname("");
    setSkills("");
    setSnsUrl("");
    setEmail("");
    setProfileFile(null);
    setCroppedArea(null);
  };

  const startEdit = (photographer: Photographer) => {
    setEditingId(photographer.id);
    setName(photographer.name);
    setNickname(photographer.nickname ?? "");
    setSkills(photographer.skills ?? "");
    setSnsUrl(photographer.sns_url ?? "");
    setEmail(photographer.email ?? "");
    setProfileFile(null);
    setCroppedArea(null);
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      let profileImagePath: string | undefined;

      if (profileFile) {
        // 선택한 영역만 잘라 512x512 JPEG로 업로드한다.
        const uploadFile = croppedArea
          ? await cropToSquareJpeg(profileFile, croppedArea)
          : profileFile;

        const urlRes = await fetch("/api/upload-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            adminKey,
            contentType: uploadFile.type,
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
          .uploadToSignedUrl(urlJson.path, urlJson.token, uploadFile);
        if (uploadError) {
          throw new Error(`프로필 이미지 업로드 실패: ${uploadError.message}`);
        }
        profileImagePath = urlJson.path;
      }

      const res = await fetch(
        editingId ? `/api/photographers/${editingId}` : "/api/photographers",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            adminKey,
            name,
            nickname,
            skills,
            snsUrl,
            email,
            profileImagePath,
          }),
        }
      );
      const json = await res.json();
      if (!res.ok) {
        throw new Error(
          json.error ?? (editingId ? "작가 수정 실패" : "작가 등록 실패")
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

  const onDelete = async (photographer: Photographer) => {
    if (
      !window.confirm(
        `작가 "${photographer.name}"을(를) 삭제할까요? 올린 사진은 남지만 연결이 해제됩니다.`
      )
    ) {
      return;
    }
    setDeletingId(photographer.id);
    setError(null);
    try {
      const res = await fetch(`/api/photographers/${photographer.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminKey }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "삭제 실패");
      if (editingId === photographer.id) resetForm();
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
          작가 관리{" "}
          <span className="text-sm font-normal text-neutral-400">
            {photographers.length}명
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

      {photographers.length > 0 && (
        <ul className="space-y-2">
          {photographers.map((p) => (
            <li
              key={p.id}
              className={`flex items-center gap-4 rounded-xl border bg-white/5 p-3 ${
                editingId === p.id ? "border-white/40" : "border-white/10"
              }`}
            >
              <ProfileAvatar photographer={p} size="h-12 w-12" />
              <div className="min-w-0 flex-1">
                <Link
                  href={`/photographers/${p.id}`}
                  className="truncate font-medium text-neutral-100 hover:underline"
                >
                  {p.name}
                  {p.nickname && (
                    <span className="ml-1.5 text-sm text-neutral-400">
                      {p.nickname}
                    </span>
                  )}
                </Link>
                <p className="mt-0.5 flex flex-wrap gap-x-2 truncate text-xs text-neutral-400">
                  {p.skills && <span>{p.skills}</span>}
                  {p.email && <span>{p.email}</span>}
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
                onClick={() => startEdit(p)}
                className="shrink-0 rounded-full border border-white/20 px-4 py-1.5 text-sm text-neutral-300 hover:bg-white/10"
              >
                수정
              </button>
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
        onSubmit={onSubmit}
        className="space-y-4 rounded-xl border border-white/10 bg-white/5 p-4"
      >
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-neutral-200">
            {editing ? `"${editing.name}" 수정` : "새 작가 등록"}
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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input
            type="url"
            value={snsUrl}
            onChange={(e) => setSnsUrl(e.target.value)}
            placeholder="SNS 링크 (예: https://instagram.com/...)"
            className={inputCls}
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="이메일 (예: photo@example.com)"
            className={inputCls}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs text-neutral-400">
            프로필 이미지 {editing ? "(새로 선택하면 교체됩니다)" : "(선택)"}
          </label>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => {
              setProfileFile(e.target.files?.[0] ?? null);
              setCroppedArea(null);
            }}
            className="w-full text-sm text-neutral-300 file:mr-3 file:rounded-full file:border-0 file:bg-white file:px-4 file:py-1.5 file:text-sm file:font-medium file:text-black hover:file:bg-neutral-200"
          />
        </div>
        {profileFile && (
          <ProfileImageCropper
            key={`${profileFile.name}-${profileFile.lastModified}-${profileFile.size}`}
            file={profileFile}
            onCropComplete={setCroppedArea}
          />
        )}
        <button
          type="submit"
          disabled={saving || name.trim().length === 0}
          className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-black hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving ? "저장 중..." : editing ? "수정 저장" : "작가 등록"}
        </button>
      </form>
    </div>
  );
}

export default function AdminPhotographersPage() {
  return (
    <AdminGate>
      {(adminKey) => <PhotographerManager adminKey={adminKey} />}
    </AdminGate>
  );
}
