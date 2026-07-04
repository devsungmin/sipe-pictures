import {
  getSupabaseAnon,
  isSupabaseConfigured,
  photoPublicUrl,
} from "@/lib/supabase";
import PhotoMap, { type MapPhoto } from "./photo-map";

export const dynamic = "force-dynamic";

interface PhotoRow {
  id: string;
  title: string | null;
  storage_path: string;
  latitude: number;
  longitude: number;
}

async function fetchPhotosWithLocation(): Promise<MapPhoto[]> {
  const supabase = getSupabaseAnon();
  const { data, error } = await supabase
    .from("photos")
    .select("id, title, storage_path, latitude, longitude")
    .not("latitude", "is", null)
    .not("longitude", "is", null)
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw new Error(error.message);
  return ((data ?? []) as PhotoRow[]).map((row) => ({
    id: row.id,
    title: row.title,
    imageUrl: photoPublicUrl(row.storage_path),
    latitude: row.latitude,
    longitude: row.longitude,
  }));
}

export default async function MapPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-6 text-sm text-amber-200">
        Supabase 설정이 필요합니다. README.md를 참고해 주세요.
      </div>
    );
  }

  let photos: MapPhoto[];
  try {
    photos = await fetchPhotosWithLocation();
  } catch (e) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-200">
        사진을 불러오지 못했습니다: {e instanceof Error ? e.message : String(e)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">촬영 지도</h1>
        <p className="mt-1 text-sm text-neutral-400">
          위치 정보가 있는 사진 {photos.length}장이 지도에 표시됩니다. 마커를
          누르면 사진으로 이동할 수 있어요.
        </p>
      </div>
      {photos.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-24 text-center text-neutral-400">
          <p className="text-4xl">🗺️</p>
          <p>위치 정보(GPS)가 담긴 사진이 아직 없어요.</p>
        </div>
      ) : (
        <PhotoMap photos={photos} />
      )}
    </div>
  );
}
