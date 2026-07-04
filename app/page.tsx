import Link from "next/link";
import {
  getSupabaseAnon,
  isSupabaseConfigured,
  photoPublicUrl,
} from "@/lib/supabase";
import { cameraLabel, formatTakenAt } from "@/lib/format";
import type { Photo } from "@/lib/types";

export const dynamic = "force-dynamic";

async function fetchPhotos(): Promise<Photo[]> {
  const supabase = getSupabaseAnon();
  const { data, error } = await supabase
    .from("photos")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export default async function GalleryPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-6 text-sm leading-6 text-amber-200">
        <p className="font-semibold">Supabase 설정이 필요합니다</p>
        <p className="mt-2 text-amber-200/80">
          README.md의 안내에 따라 <code>.env.local</code>에{" "}
          <code>NEXT_PUBLIC_SUPABASE_URL</code>,{" "}
          <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>를 설정해 주세요.
        </p>
      </div>
    );
  }

  let photos: Photo[];
  try {
    photos = await fetchPhotos();
  } catch (e) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-200">
        사진을 불러오지 못했습니다: {e instanceof Error ? e.message : String(e)}
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center text-neutral-400">
        <p className="text-4xl">🌄</p>
        <p>아직 올라온 사진이 없어요.</p>
        <Link
          href="/upload"
          className="rounded-full bg-white px-5 py-2 text-sm font-medium text-black hover:bg-neutral-200"
        >
          첫 사진 올리기
        </Link>
      </div>
    );
  }

  return (
    <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 [&>*]:mb-4">
      {photos.map((photo) => {
        const camera = cameraLabel(photo.camera_make, photo.camera_model);
        const takenAt = formatTakenAt(photo.taken_at);
        return (
          <Link
            key={photo.id}
            href={`/photos/${photo.id}`}
            className="group block break-inside-avoid overflow-hidden rounded-xl border border-white/10 bg-white/5"
          >
            {/* Vercel 이미지 최적화 무료 한도를 아끼기 위해 next/image 대신 img 사용 */}
            <img
              src={photoPublicUrl(photo.storage_path)}
              alt={photo.title ?? "SIPE 출사 사진"}
              loading="lazy"
              className="w-full transition duration-300 group-hover:scale-[1.02] group-hover:opacity-90"
            />
            <div className="px-4 py-3 text-sm">
              <p className="font-medium text-neutral-100">
                {photo.title ?? "무제"}
              </p>
              <p className="mt-1 flex flex-wrap gap-x-2 text-xs text-neutral-400">
                {camera && <span>{camera}</span>}
                {takenAt && <span>{takenAt}</span>}
                {photo.latitude != null && photo.longitude != null && (
                  <span>📍 위치 정보</span>
                )}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
