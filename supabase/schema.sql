-- sipe-pictures Supabase 스키마
-- Supabase 대시보드 > SQL Editor에서 전체를 실행하세요.
-- (모든 문장이 멱등이라 기존 프로젝트에서 다시 실행해도 안전합니다)

-- 1) 작가 프로필 테이블
create table if not exists public.photographers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  nickname text,
  skills text,
  sns_url text,
  email text,
  profile_image_path text,
  created_at timestamptz not null default now()
);

-- 기존 프로젝트에 테이블이 이미 있을 때를 위한 컬럼 보강
alter table public.photographers
  add column if not exists sns_url text;
alter table public.photographers
  add column if not exists email text;

alter table public.photographers enable row level security;

drop policy if exists "public read" on public.photographers;
create policy "public read"
  on public.photographers for select
  using (true);

-- 2) 출사 앨범(이벤트) 테이블
create table if not exists public.albums (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  event_date date,
  created_at timestamptz not null default now()
);

alter table public.albums enable row level security;

drop policy if exists "public read" on public.albums;
create policy "public read"
  on public.albums for select
  using (true);

-- 3) 사진 메타데이터 테이블
create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  title text,
  description text,
  uploader text,
  storage_path text not null unique,
  thumb_path text,
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

-- 작가 연결 (작가 삭제 시 사진은 남기고 연결만 해제)
alter table public.photos
  add column if not exists photographer_id uuid references public.photographers (id) on delete set null;

-- 앨범 연결 (앨범 삭제 시 사진은 남기고 연결만 해제)
alter table public.photos
  add column if not exists album_id uuid references public.albums (id) on delete set null;

-- 목록용 썸네일 경로 (없으면 원본을 그대로 사용)
alter table public.photos
  add column if not exists thumb_path text;

-- 4) RLS: 누구나 조회 가능, 쓰기는 service role(서버 API)만 가능
alter table public.photos enable row level security;

drop policy if exists "public read" on public.photos;
create policy "public read"
  on public.photos for select
  using (true);

-- 5) 사진 이모지 반응 (익명 카운트)
create table if not exists public.photo_reactions (
  photo_id uuid not null references public.photos (id) on delete cascade,
  emoji text not null,
  count integer not null default 0,
  primary key (photo_id, emoji)
);

alter table public.photo_reactions enable row level security;

drop policy if exists "public read" on public.photo_reactions;
create policy "public read"
  on public.photo_reactions for select
  using (true);

-- 반응 카운트를 원자적으로 증감한다 (0 아래로는 내려가지 않음).
-- 쓰기는 service role을 쓰는 서버 API에서만 호출한다.
create or replace function public.adjust_reaction(
  p_photo_id uuid,
  p_emoji text,
  p_delta integer
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.photo_reactions (photo_id, emoji, count)
  values (p_photo_id, p_emoji, greatest(p_delta, 0))
  on conflict (photo_id, emoji)
  do update set count = greatest(public.photo_reactions.count + p_delta, 0);
end;
$$;

-- 6) Storage 버킷: 공개 읽기 (쓰기는 서버가 발급한 서명 URL로만)
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do nothing;
