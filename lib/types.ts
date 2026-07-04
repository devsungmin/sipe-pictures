export interface Photo {
  id: string;
  title: string | null;
  description: string | null;
  uploader: string | null;
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
