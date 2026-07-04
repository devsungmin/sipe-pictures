import { createClient, SupabaseClient } from "@supabase/supabase-js";

export const PHOTOS_BUCKET = "photos";

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

/** 읽기 전용(anon) 클라이언트 — 갤러리 조회, 브라우저 업로드에 사용 */
export function getSupabaseAnon(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase 환경 변수(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)가 설정되지 않았습니다."
    );
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

/** 서버 전용(service role) 클라이언트 — 업로드 API에서만 사용 */
export function getSupabaseAdmin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase 환경 변수(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)가 설정되지 않았습니다."
    );
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

/** Storage public 버킷의 사진 공개 URL */
export function photoPublicUrl(storagePath: string): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return `${url}/storage/v1/object/public/${PHOTOS_BUCKET}/${storagePath}`;
}
