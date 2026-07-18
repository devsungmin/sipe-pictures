# 📷 sipe-pictures

SIPE 동아리 출사 모임의 사진 공유 갤러리입니다.

- 사진 업로드 및 갤러리 공유
- EXIF 메타데이터 자동 추출 (카메라, 렌즈, 조리개, 셔터 속도, ISO, 촬영 일시)
- GPS 정보가 있으면 사진 상세 페이지에서 촬영 위치를 구글 지도에 표시
- 지도 탭에서 위치 정보가 있는 모든 사진을 마커로 한눈에 보기 (Leaflet + OpenStreetMap)
- 로그인 대신 **관리자 키** 입력으로 업로드 (SIPE 회원에게만 키 공유)
- 작가 프로필 (프로필 이미지·닉네임·주요 기술·SNS 링크) — 업로드 시 작가를 선택하고, 프로필 페이지에서 그 작가의 사진을 모아 볼 수 있음
- 출사 앨범 — 모임 단위로 사진을 묶어 앨범 페이지에서 모아 보기
- 업로드 시 목록용 썸네일 자동 생성 (목록 로딩 속도·트래픽 절약), 링크 공유 시 사진 미리보기(OG 태그)

## 기술 스택 (전부 무료)

- **프론트엔드/서버**: Next.js → Vercel Hobby 플랜 (무료)
- **사진 저장소 + DB**: Supabase Free 티어, Storage 1GB · DB 500MB (무료)
- **지도**: 상세 페이지는 구글 지도 embed, 지도 탭은 Leaflet + OpenStreetMap — 둘 다 API 키 불필요 (무료)
- **EXIF 추출**: exifr, 브라우저에서 처리 (무료)

사진은 브라우저에서 Supabase Storage로 **직접 업로드**되므로 Vercel의 요청 크기 제한(4.5MB)에 걸리지 않습니다.

## 1. Supabase 설정

1. [supabase.com](https://supabase.com)에서 무료 프로젝트를 만듭니다.
2. 대시보드 → **SQL Editor**에서 [`supabase/schema.sql`](./supabase/schema.sql) 내용을 붙여넣고 실행합니다.
   - `photos` 테이블과 공개 읽기 정책, `photos` Storage 버킷이 생성됩니다.
3. 대시보드 → **Settings → API**에서 아래 값을 확인합니다.
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - service_role key → `SUPABASE_SERVICE_ROLE_KEY` (서버 전용, 노출 금지)

## 2. 로컬 실행

```bash
cp .env.example .env.local
# .env.local에 Supabase 값과 ADMIN_UPLOAD_KEY(원하는 문자열)를 채웁니다

npm install
npm run dev
```

<http://localhost:3000> 접속 → 업로드 페이지에서 관리자 키를 입력하고 사진을 올려보세요.

## 3. Vercel 무료 배포

1. 이 저장소를 GitHub에 푸시합니다.
2. [vercel.com](https://vercel.com)에서 **Add New → Project** → 저장소를 import 합니다.
3. **Environment Variables**에 `.env.local`과 동일한 4개 값을 등록합니다.
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ADMIN_UPLOAD_KEY`
4. Deploy를 누르면 끝. 이후 `main` 브랜치에 푸시할 때마다 자동 배포됩니다.

## 동작 방식

```text
[업로드]
브라우저: EXIF 추출(exifr)
   → POST /api/upload-url (관리자 키 검증, 서명 URL 발급)
   → Supabase Storage에 파일 직접 업로드
   → POST /api/photos (관리자 키 검증, 메타데이터 저장)

[조회]
갤러리(/)와 상세(/photos/[id])는 anon 키로 읽기 전용 조회
GPS 좌표가 있으면 구글 지도 iframe으로 촬영 위치 표시
```

## 보안 메모

- 쓰기(업로드·레코드 생성)는 모두 서버 API에서 `ADMIN_UPLOAD_KEY` 검증 후에만 가능합니다.
- `photos` 테이블은 RLS로 읽기만 공개되어 있고, anon 키로는 쓰기가 불가능합니다.
- iPhone 사진(HEIC)은 브라우저 호환성을 위해 업로드 시 자동으로 JPG로 변환됩니다. EXIF(GPS 포함)는 변환 전 원본에서 추출되므로 그대로 유지됩니다.
