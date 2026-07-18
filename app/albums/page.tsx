import Link from "next/link";
import {
  getSupabaseAnon,
  isSupabaseConfigured,
  photoThumbUrl,
} from "@/lib/supabase";
import type { Album } from "@/lib/types";
import ScrollReveal from "@/app/scroll-reveal";

export const dynamic = "force-dynamic";

type AlbumWithCount = Album & { photos: { count: number }[] };

interface CoverRow {
  album_id: string;
  storage_path: string;
  thumb_path: string | null;
}

interface AlbumListItem {
  album: AlbumWithCount;
  photoCount: number;
  coverUrl: string | null;
}

async function fetchAlbums(): Promise<AlbumListItem[]> {
  const supabase = getSupabaseAnon();
  const [albumsRes, coversRes] = await Promise.all([
    supabase
      .from("albums")
      .select("*, photos(count)")
      .order("event_date", { ascending: false, nullsFirst: false }),
    // 앨범별 대표(커버) 이미지용 — 최근 사진에서 앨범당 첫 장을 고른다.
    supabase
      .from("photos")
      .select("album_id, storage_path, thumb_path")
      .not("album_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(300),
  ]);
  if (albumsRes.error) throw new Error(albumsRes.error.message);

  const covers = new Map<string, string>();
  for (const row of (coversRes.data ?? []) as CoverRow[]) {
    if (!covers.has(row.album_id)) {
      covers.set(row.album_id, photoThumbUrl(row));
    }
  }

  return ((albumsRes.data ?? []) as AlbumWithCount[]).map((album) => ({
    album,
    photoCount: album.photos[0]?.count ?? 0,
    coverUrl: covers.get(album.id) ?? null,
  }));
}

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

export default async function AlbumsPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-6 text-sm text-amber-200">
        Supabase 설정이 필요합니다. README.md를 참고해 주세요.
      </div>
    );
  }

  let albums: AlbumListItem[];
  try {
    albums = await fetchAlbums();
  } catch (e) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-200">
        앨범 목록을 불러오지 못했습니다:{" "}
        {e instanceof Error ? e.message : String(e)}
      </div>
    );
  }

  if (albums.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-center text-neutral-400">
        <p className="text-4xl">📔</p>
        <p>아직 만들어진 앨범이 없어요.</p>
        <p className="text-sm">사진 업로드 시 앨범을 만들 수 있습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">앨범</h1>
        <p className="mt-1 text-sm text-neutral-400">
          출사 모임별로 모아 보는 사진 앨범 {albums.length}개
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {albums.map(({ album, photoCount, coverUrl }, i) => (
          <ScrollReveal key={album.id} delay={Math.min(i, 8) * 70}>
            <Link
              href={`/albums/${album.id}`}
              className="group block overflow-hidden rounded-xl border border-white/10 bg-white/5 transition-all duration-300 hover:-translate-y-1 hover:border-white/25 hover:shadow-xl hover:shadow-black/40"
            >
              <div className="aspect-[4/3] overflow-hidden bg-white/5">
                {coverUrl ? (
                  // Vercel 이미지 최적화 무료 한도를 아끼기 위해 next/image 대신 img 사용
                  <img
                    src={coverUrl}
                    alt={album.name}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-4xl">
                    📔
                  </div>
                )}
              </div>
              <div className="px-4 py-3 text-sm">
                <p className="font-medium text-neutral-100">{album.name}</p>
                <p className="mt-1 flex flex-wrap gap-x-2 text-xs text-neutral-400">
                  {formatEventDate(album.event_date) && (
                    <span>{formatEventDate(album.event_date)}</span>
                  )}
                  <span>사진 {photoCount}장</span>
                </p>
              </div>
            </Link>
          </ScrollReveal>
        ))}
      </div>
    </div>
  );
}
