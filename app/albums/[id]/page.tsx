import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getSupabaseAnon,
  isSupabaseConfigured,
  photoPublicUrl,
  photoThumbUrl,
} from "@/lib/supabase";
import { cameraLabel, formatTakenAt } from "@/lib/format";
import type { Album, PhotoWithPhotographer } from "@/lib/types";
import ScrollReveal from "@/app/scroll-reveal";

export const dynamic = "force-dynamic";

function formatEventDate(date: string | null): string | null {
  if (!date) return null;
  const parsed = new Date(`${date}T00:00:00+09:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  if (!isSupabaseConfigured()) return {};
  const { id } = await params;
  const supabase = getSupabaseAnon();
  const { data: album } = (await supabase
    .from("albums")
    .select("*")
    .eq("id", id)
    .maybeSingle()) as { data: Album | null };
  if (!album) return {};
  return {
    title: album.name,
    description: album.description ?? `SIPE 출사 앨범 — ${album.name}`,
  };
}

export default async function AlbumDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!isSupabaseConfigured()) notFound();

  const { id } = await params;
  const supabase = getSupabaseAnon();

  const { data: album } = (await supabase
    .from("albums")
    .select("*")
    .eq("id", id)
    .maybeSingle()) as { data: Album | null };

  if (!album) notFound();

  const { data: photos } = (await supabase
    .from("photos")
    .select("*, photographer:photographers(*)")
    .eq("album_id", id)
    .order("taken_at", { ascending: true, nullsFirst: false })) as {
    data: PhotoWithPhotographer[] | null;
  };

  const photoList = photos ?? [];
  const eventDate = formatEventDate(album.event_date);

  return (
    <div className="space-y-8">
      <Link
        href="/albums"
        className="inline-flex items-center gap-1 text-sm text-neutral-400 hover:text-white"
      >
        ← 앨범 목록으로
      </Link>

      <div>
        <h1 className="text-2xl font-semibold">{album.name}</h1>
        <p className="mt-1 flex flex-wrap gap-x-3 text-sm text-neutral-400">
          {eventDate && <span>{eventDate}</span>}
          <span>사진 {photoList.length}장</span>
        </p>
        {album.description && (
          <p className="mt-2 whitespace-pre-wrap text-neutral-300">
            {album.description}
          </p>
        )}
      </div>

      {photoList.length === 0 ? (
        <p className="py-16 text-center text-neutral-400">
          이 앨범에는 아직 사진이 없어요.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {photoList.map((photo, i) => {
            const camera = cameraLabel(photo.camera_make, photo.camera_model);
            const takenAt = formatTakenAt(photo.taken_at);
            const photographerName =
              photo.photographer?.name ?? photo.uploader;
            return (
              <ScrollReveal key={photo.id} delay={Math.min(i, 8) * 70}>
                <Link
                  href={`/photos/${photo.id}`}
                  className="group block overflow-hidden rounded-xl border border-white/10 bg-white/5 transition-all duration-300 hover:-translate-y-1 hover:border-white/25 hover:shadow-xl hover:shadow-black/40"
                >
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
                              src={photoPublicUrl(
                                photo.photographer.profile_image_path
                              )}
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
                    </p>
                  </div>
                </Link>
              </ScrollReveal>
            );
          })}
        </div>
      )}
    </div>
  );
}
