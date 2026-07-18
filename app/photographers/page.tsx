import Link from "next/link";
import { getSupabaseAnon, isSupabaseConfigured } from "@/lib/supabase";
import type { Photographer } from "@/lib/types";
import ScrollReveal from "@/components/scroll-reveal";
import Avatar from "@/components/avatar";
import { SetupNotice, ErrorNotice, EmptyState } from "@/components/notice";

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
    return <SetupNotice />;
  }

  let photographers: PhotographerWithCount[];
  try {
    photographers = await fetchPhotographers();
  } catch (e) {
    return (
      <ErrorNotice>
        작가 목록을 불러오지 못했습니다:{" "}
        {e instanceof Error ? e.message : String(e)}
      </ErrorNotice>
    );
  }

  if (photographers.length === 0) {
    return (
      <EmptyState emoji="👤">
        <p>아직 등록된 작가가 없어요.</p>
      </EmptyState>
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
                <Avatar
                  imagePath={photographer.profile_image_path}
                  alt={photographer.name}
                  className="h-16 w-16 border border-white/15 transition-transform duration-300 group-hover:scale-105"
                  fallbackClassName="text-2xl"
                />
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
