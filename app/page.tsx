import Link from "next/link";
import {
  getSupabaseAnon,
  isSupabaseConfigured,
  photoPublicUrl,
  photoThumbUrl,
} from "@/lib/supabase";
import { cameraLabel, formatTakenAt } from "@/lib/format";
import type { PhotoWithPhotographer } from "@/lib/types";
import ScrollReveal from "./scroll-reveal";

export const dynamic = "force-dynamic";

async function fetchPhotos(): Promise<PhotoWithPhotographer[]> {
  const supabase = getSupabaseAnon();
  const { data, error } = await supabase
    .from("photos")
    .select("*, photographer:photographers(*)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  return (data ?? []) as PhotoWithPhotographer[];
}

/** Fisher-Yates 셔플 (원본 비변경) */
function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

interface DayGroup {
  key: string;
  label: string;
  photos: PhotoWithPhotographer[];
}

/** 촬영일(없으면 업로드일) 기준으로 KST 날짜별 그룹을 만든다. 최신 날짜 우선. */
function groupByDay(photos: PhotoWithPhotographer[]): DayGroup[] {
  const keyFormat = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const labelFormat = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });

  const groups = new Map<string, DayGroup>();
  for (const photo of photos) {
    const date = new Date(photo.taken_at ?? photo.created_at);
    const key = keyFormat.format(date);
    const group = groups.get(key);
    if (group) {
      group.photos.push(photo);
    } else {
      groups.set(key, { key, label: labelFormat.format(date), photos: [photo] });
    }
  }

  return [...groups.values()]
    .sort((a, b) => b.key.localeCompare(a.key))
    .map((group) => ({ ...group, photos: shuffle(group.photos) }));
}

function PhotoCard({
  photo,
  delay,
}: {
  photo: PhotoWithPhotographer;
  delay: number;
}) {
  const camera = cameraLabel(photo.camera_make, photo.camera_model);
  const takenAt = formatTakenAt(photo.taken_at);
  const photographerName = photo.photographer?.name ?? photo.uploader;
  return (
    <ScrollReveal delay={delay}>
      <Link
        href={`/photos/${photo.id}`}
        className="group block overflow-hidden rounded-xl border border-white/10 bg-white/5 transition-all duration-300 hover:-translate-y-1 hover:border-white/25 hover:shadow-xl hover:shadow-black/40"
      >
        {/* 가로/세로 사진이 섞여도 정돈되어 보이도록 카드 비율을 4:3으로 고정하고 잘라서 보여준다. 원본 비율은 상세 페이지에서 확인. */}
        <div className="aspect-[4/3] overflow-hidden">
          {/* Vercel 이미지 최적화 무료 한도를 아끼기 위해 next/image 대신 img 사용 */}
          <img
            src={photoThumbUrl(photo)}
            alt={photo.title ?? "SIPE 출사 사진"}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          />
        </div>
        <div className="px-4 py-3 text-sm">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate font-medium text-neutral-100">
              {photo.title ?? "무제"}
            </p>
            {photographerName && (
              <span className="flex shrink-0 items-center gap-1.5 text-xs text-neutral-300">
                {photo.photographer?.profile_image_path ? (
                  // 프로필 사진은 원형으로 보여준다.
                  <img
                    src={photoPublicUrl(photo.photographer.profile_image_path)}
                    alt={photographerName}
                    loading="lazy"
                    className="h-5 w-5 rounded-full object-cover"
                  />
                ) : (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-[10px]">
                    📷
                  </span>
                )}
                {photographerName}
              </span>
            )}
          </div>
          <p className="mt-1 flex flex-wrap gap-x-2 text-xs text-neutral-400">
            {camera && <span>{camera}</span>}
            {takenAt && <span>{takenAt}</span>}
            {photo.latitude != null && photo.longitude != null && (
              <span>📍 위치 정보</span>
            )}
          </p>
        </div>
      </Link>
    </ScrollReveal>
  );
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

  let photos: PhotoWithPhotographer[];
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

  const groups = groupByDay(photos);

  return (
    <div className="space-y-14">
      {groups.map((group) => (
        <section key={group.key}>
          <ScrollReveal>
            <div className="mb-5 flex items-center gap-4">
              <h2 className="shrink-0 text-lg font-semibold tracking-tight">
                {group.label}
              </h2>
              <span className="shrink-0 rounded-full bg-white/10 px-2.5 py-0.5 text-xs text-neutral-300">
                {group.photos.length}장
              </span>
              <div className="h-px flex-1 bg-gradient-to-r from-white/20 to-transparent" />
            </div>
          </ScrollReveal>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {group.photos.map((photo, i) => (
              <PhotoCard key={photo.id} photo={photo} delay={Math.min(i, 8) * 70} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
