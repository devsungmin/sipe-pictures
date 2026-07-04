-- sipe-pictures Supabase 스키마
-- Supabase 대시보드 > SQL Editor에서 전체를 실행하세요.

-- 1) 사진 메타데이터 테이블
create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  title text,
  description text,
  uploader text,
  storage_path text not null unique,
  taken_at timestamptz,
  camera_make text,
  camera_model text,
  lens_model text,
  focal_length numeric,
  aperture numeric,
  exposure_time numeric,
  iso integer,
  latitude double precision,
  longitude double precision,
  width integer,
  height integer,
  created_at timestamptz not null default now()
);

-- 2) RLS: 누구나 조회 가능, 쓰기는 service role(서버 API)만 가능
alter table public.photos enable row level security;

drop policy if exists "public read" on public.photos;
create policy "public read"
  on public.photos for select
  using (true);

-- 3) Storage 버킷: 공개 읽기 (쓰기는 서버가 발급한 서명 URL로만)
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do nothing;
