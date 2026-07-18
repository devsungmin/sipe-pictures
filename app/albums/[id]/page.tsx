import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSupabaseAnon, isSupabaseConfigured } from "@/lib/supabase";
import { formatEventDate } from "@/lib/format";
import type { Album, PhotoWithPhotographer } from "@/lib/types";
import PhotoCard from "@/components/photo-card";

export const dynamic = "force-dynamic";

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
          {photoList.map((photo, i) => (
            <PhotoCard key={photo.id} photo={photo} delay={Math.min(i, 8) * 70} />
          ))}
        </div>
      )}
    </div>
  );
}
