"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { extractExif } from "@/lib/exif";
import { getSupabaseAnon, PHOTOS_BUCKET } from "@/lib/supabase";

type FileStatus = {
  name: string;
  state: "대기" | "업로드 중" | "완료" | "실패";
  error?: string;
};

async function uploadOne(
  file: File,
  adminKey: string,
  fields: { title: string; description: string; uploader: string },
  isSingle: boolean
): Promise<void> {
  const exif = await extractExif(file);

  const urlRes = await fetch("/api/upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ adminKey, contentType: file.type }),
  });
  const urlJson = await urlRes.json();
  if (!urlRes.ok) throw new Error(urlJson.error ?? "업로드 URL 발급 실패");

  const supabase = getSupabaseAnon();
  const { error: uploadError } = await supabase.storage
    .from(PHOTOS_BUCKET)
    .uploadToSignedUrl(urlJson.path, urlJson.token, file);
  if (uploadError) throw new Error(`파일 업로드 실패: ${uploadError.message}`);

  const title = isSingle
    ? fields.title || file.name.replace(/\.[^.]+$/, "")
    : file.name.replace(/\.[^.]+$/, "");

  const photoRes = await fetch("/api/photos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      adminKey,
      storagePath: urlJson.path,
      title,
      description: fields.description,
      uploader: fields.uploader,
      exif,
    }),
  });
  const photoJson = await photoRes.json();
  if (!photoRes.ok) throw new Error(photoJson.error ?? "사진 정보 저장 실패");
}

export default function UploadPage() {
  const router = useRouter();
  const [adminKey, setAdminKey] = useState("");
  const [uploader, setUploader] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [statuses, setStatuses] = useState<FileStatus[]>([]);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0 || busy) return;

    setBusy(true);
    const next: FileStatus[] = files.map((f) => ({
      name: f.name,
      state: "대기",
    }));
    setStatuses([...next]);

    let failed = 0;
    for (let i = 0; i < files.length; i++) {
      next[i] = { ...next[i], state: "업로드 중" };
      setStatuses([...next]);
      try {
        await uploadOne(
          files[i],
          adminKey,
          { title, description, uploader },
          files.length === 1
        );
        next[i] = { ...next[i], state: "완료" };
      } catch (err) {
        failed++;
        next[i] = {
          ...next[i],
          state: "실패",
          error: err instanceof Error ? err.message : String(err),
        };
      }
      setStatuses([...next]);
    }
    setBusy(false);

    if (failed === 0) {
      router.push("/");
      router.refresh();
    }
  };

  const inputCls =
    "w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm outline-none placeholder:text-neutral-500 focus:border-white/40";

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-semibold">사진 업로드</h1>
      <p className="mt-2 text-sm text-neutral-400">
        SIPE 회원에게 공유된 관리자 키를 입력하면 사진을 올릴 수 있어요. EXIF
        메타데이터(카메라, 촬영 설정, 위치)는 자동으로 추출됩니다.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-5">
        <div>
          <label className="mb-1.5 block text-sm font-medium">
            관리자 키 <span className="text-red-400">*</span>
          </label>
          <input
            type="password"
            required
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
            placeholder="관리자 키를 입력하세요"
            className={inputCls}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">
            사진 파일 <span className="text-red-400">*</span>
          </label>
          <input
            type="file"
            required
            multiple
            accept="image/jpeg,image/png,image/webp,image/heic"
            onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
            className="w-full text-sm text-neutral-300 file:mr-3 file:rounded-full file:border-0 file:bg-white file:px-4 file:py-1.5 file:text-sm file:font-medium file:text-black hover:file:bg-neutral-200"
          />
          <p className="mt-1 text-xs text-neutral-500">
            jpg, png, webp, heic · 여러 장 선택 가능
          </p>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">올린 사람</label>
          <input
            value={uploader}
            onChange={(e) => setUploader(e.target.value)}
            placeholder="이름 또는 닉네임"
            className={inputCls}
          />
        </div>

        {files.length <= 1 && (
          <div>
            <label className="mb-1.5 block text-sm font-medium">제목</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="비워두면 파일명이 제목이 됩니다"
              className={inputCls}
            />
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-sm font-medium">설명</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="출사 장소, 뒷이야기 등"
            className={inputCls}
          />
        </div>

        <button
          type="submit"
          disabled={busy || files.length === 0}
          className="w-full rounded-full bg-white py-2.5 text-sm font-semibold text-black hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? "업로드 중..." : `업로드${files.length > 1 ? ` (${files.length}장)` : ""}`}
        </button>
      </form>

      {statuses.length > 0 && (
        <ul className="mt-6 space-y-2 text-sm">
          {statuses.map((s, i) => (
            <li
              key={`${s.name}-${i}`}
              className="flex items-start justify-between gap-3 rounded-lg bg-white/5 px-4 py-2.5"
            >
              <span className="truncate text-neutral-300">{s.name}</span>
              <span
                className={
                  s.state === "완료"
                    ? "text-green-400"
                    : s.state === "실패"
                      ? "text-red-400"
                      : "text-neutral-400"
                }
              >
                {s.state === "실패" ? `실패: ${s.error}` : s.state}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
