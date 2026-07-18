import Link from "next/link";
import { getSupabaseAnon, isSupabaseConfigured } from "@/lib/supabase";
import type { PhotoWithPhotographer } from "@/lib/types";
import ScrollReveal from "@/components/scroll-reveal";
import PhotoCard from "@/components/photo-card";
import { SetupNotice, ErrorNotice, EmptyState } from "@/components/notice";

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

export default async function GalleryPage() {
  if (!isSupabaseConfigured()) {
    return <SetupNotice />;
  }

  let photos: PhotoWithPhotographer[];
  try {
    photos = await fetchPhotos();
  } catch (e) {
    return (
      <ErrorNotice>
        사진을 불러오지 못했습니다: {e instanceof Error ? e.message : String(e)}
      </ErrorNotice>
    );
  }

  if (photos.length === 0) {
    return (
      <EmptyState emoji="🌄">
        <p>아직 올라온 사진이 없어요.</p>
        <Link
          href="/upload"
          className="rounded-full bg-white px-5 py-2 text-sm font-medium text-black hover:bg-neutral-200"
        >
          첫 사진 올리기
        </Link>
      </EmptyState>
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
