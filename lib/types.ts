export interface Photographer {
  id: string;
  name: string;
  nickname: string | null;
  skills: string | null;
  sns_url: string | null;
  profile_image_path: string | null;
  created_at: string;
}

export interface Photo {
  id: string;
  title: string | null;
  description: string | null;
  uploader: string | null;
  photographer_id: string | null;
  storage_path: string;
  taken_at: string | null;
  camera_make: string | null;
  camera_model: string | null;
  lens_model: string | null;
  focal_length: number | null;
  aperture: number | null;
  exposure_time: number | null;
  iso: number | null;
  latitude: number | null;
  longitude: number | null;
  width: number | null;
  height: number | null;
  created_at: string;
}

/** photos에 photographers를 조인해서 조회할 때의 형태 */
export interface PhotoWithPhotographer extends Photo {
  photographer: Photographer | null;
}

export interface ExifData {
  taken_at: string | null;
  camera_make: string | null;
  camera_model: string | null;
  lens_model: string | null;
  focal_length: number | null;
  aperture: number | null;
  exposure_time: number | null;
  iso: number | null;
  latitude: number | null;
  longitude: number | null;
  width: number | null;
  height: number | null;
}
