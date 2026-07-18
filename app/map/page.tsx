import {
  getSupabaseAnon,
  isSupabaseConfigured,
  photoThumbUrl,
} from "@/lib/supabase";
import PhotoMap, { type MapPhoto } from "./photo-map";
import { SetupNotice, ErrorNotice, EmptyState } from "@/components/notice";

export const dynamic = "force-dynamic";

interface PhotoRow {
  id: string;
  title: string | null;
  storage_path: string;
  thumb_path: string | null;
  latitude: number;
  longitude: number;
}

async function fetchPhotosWithLocation(): Promise<MapPhoto[]> {
  const supabase = getSupabaseAnon();
  const { data, error } = await supabase
    .from("photos")
    .select("id, title, storage_path, thumb_path, latitude, longitude")
    .not("latitude", "is", null)
    .not("longitude", "is", null)
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw new Error(error.message);
  return ((data ?? []) as PhotoRow[]).map((row) => ({
    id: row.id,
    title: row.title,
    imageUrl: photoThumbUrl(row),
    latitude: row.latitude,
    longitude: row.longitude,
  }));
}

export default async function MapPage() {
  if (!isSupabaseConfigured()) {
    return <SetupNotice />;
  }

  let photos: MapPhoto[];
  try {
    photos = await fetchPhotosWithLocation();
  } catch (e) {
    return (
      <ErrorNotice>
        사진을 불러오지 못했습니다: {e instanceof Error ? e.message : String(e)}
      </ErrorNotice>
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
        <EmptyState emoji="🗺️">
          <p>위치 정보(GPS)가 담긴 사진이 아직 없어요.</p>
        </EmptyState>
      ) : (
        <PhotoMap photos={photos} />
      )}
    </div>
  );
}
