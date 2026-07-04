import Link from "next/link";
import {
  getSupabaseAnon,
  isSupabaseConfigured,
  photoPublicUrl,
} from "@/lib/supabase";
import type { Photographer } from "@/lib/types";
import ScrollReveal from "@/app/scroll-reveal";

export const dynamic = "force-dynamic";

type PhotographerWithCount = Photographer & { photos: { count: number }[] };

async function fetchPhotographers(): Promise<PhotographerWithCount[]> {
  const supabase = getSupabaseAnon();
  const { data, error } = await supabase
    .from("photographers")
    .select("*, photos(count)")
    .order("name");
  if (error) throw new Error(error.message);
  return (data ?? []) as PhotographerWithCount[];
}

export default async function PhotographersPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-6 text-sm text-amber-200">
        Supabase 설정이 필요합니다. README.md를 참고해 주세요.
      </div>
    );
  }

  let photographers: PhotographerWithCount[];
  try {
    photographers = await fetchPhotographers();
  } catch (e) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-200">
        작가 목록을 불러오지 못했습니다:{" "}
        {e instanceof Error ? e.message : String(e)}
      </div>
    );
  }

  if (photographers.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-center text-neutral-400">
        <p className="text-4xl">👤</p>
        <p>아직 등록된 작가가 없어요.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">작가</h1>
        <p className="mt-1 text-sm text-neutral-400">
          SIPE 출사 모임에서 활동 중인 작가 {photographers.length}명
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {photographers.map((photographer, i) => {
          const photoCount = photographer.photos[0]?.count ?? 0;
          return (
            <ScrollReveal key={photographer.id} delay={Math.min(i, 8) * 70}>
              <Link
                href={`/photographers/${photographer.id}`}
                className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-white/25 hover:shadow-xl hover:shadow-black/40"
              >
                {photographer.profile_image_path ? (
                  // 프로필 사진은 원형으로 보여준다.
                  <img
                    src={photoPublicUrl(photographer.profile_image_path)}
                    alt={photographer.name}
                    loading="lazy"
                    className="h-16 w-16 shrink-0 rounded-full border border-white/15 object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/10 text-2xl">
                    📷
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate font-semibold text-neutral-100">
                    {photographer.name}
                    {photographer.nickname && (
                      <span className="ml-1.5 text-sm font-normal text-neutral-400">
                        {photographer.nickname}
                      </span>
                    )}
                  </p>
                  {photographer.skills && (
                    <p className="mt-0.5 truncate text-xs text-neutral-400">
                      {photographer.skills}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-neutral-500">
                    사진 {photoCount}장
                  </p>
                </div>
              </Link>
            </ScrollReveal>
          );
        })}
      </div>
    </div>
  );
}
