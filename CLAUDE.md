# sipe-pictures

## 주요 기능

- SIPE 동아리 출사 모임 사진을 웹사이트에 올려 공유한다.
- 사진의 EXIF 메타데이터(카메라, 렌즈, 조리개, 셔터 속도, ISO, 촬영 일시)를 추출해 사진 하단에 표시한다.
- 사진의 GPS 메타데이터를 추출해 상세 페이지의 구글 지도(embed)에 촬영 위치를 표시한다.
- 지도 탭(`/map`)에서 위치 정보가 있는 모든 사진을 마커로 모아 볼 수 있다 (Leaflet + OpenStreetMap).
- 로그인 없이 관리자 키(`ADMIN_UPLOAD_KEY`) 입력만으로 SIPE 회원이 사진을 업로드할 수 있다. 업로드는 키 인증 → 업로드 폼의 2단계로 진행된다.
- 작가 프로필(원형 프로필 이미지 — 등록 시 영역 크롭, 이름, 닉네임, 주요 기술, SNS 링크, 이메일)을 관리자 페이지에서 등록/수정/삭제하고, 업로드 시 작가를 선택해 연결한다. 작가 목록(`/photographers`)과 프로필 페이지(`/photographers/[id]`)에서 작가 정보와 그가 올린 사진을 보여준다.

## 기술 스택

모든 구성 요소는 무료 티어로 운영하는 것을 원칙으로 한다.

- **프레임워크**: Next.js (App Router) + TypeScript
- **스타일링**: Tailwind CSS
- **배포**: Vercel (Hobby 플랜)
- **사진 저장소 + DB**: Supabase (Storage + Postgres, Free 티어)
- **EXIF 추출**: exifr (브라우저에서 처리, 서버로 원본 미전송)
- **지도 (상세 페이지)**: 구글 지도 iframe embed (API 키 불필요)
- **지도 (지도 탭)**: Leaflet + OpenStreetMap 타일 (API 키·결제 불필요)

## 프로젝트 구조

```text
app/
  page.tsx                 갤러리(목록) 페이지
  photos/[id]/page.tsx     사진 상세 페이지 (메타데이터 + 지도)
  map/page.tsx             지도 탭 — 위치 정보 있는 사진 목록 조회
  map/photo-map.tsx        Leaflet 지도 렌더링 (클라이언트 컴포넌트)
  photographers/page.tsx   작가 목록 페이지
  photographers/[id]/page.tsx 작가 프로필 + 올린 사진 목록
  upload/page.tsx          업로드 페이지 — 키 인증 후 업로드 폼 (2단계)
  sipe/admin/page.tsx      관리자 허브 — 관리 항목 선택
  sipe/admin/admin-gate.tsx 관리자 공용 인증 게이트 (sessionStorage로 키 유지)
  sipe/admin/photos/page.tsx 사진 관리 — 목록/수정/삭제
  sipe/admin/photographers/page.tsx 작가 관리 — 등록(크롭)/수정/삭제
  api/upload-url/route.ts  관리자 키 검증 후 Storage 서명 업로드 URL 발급 (kind=profile이면 프로필 이미지 경로)
  api/photos/route.ts      업로드 완료 후 사진 메타데이터 레코드 생성
  api/photos/[id]/route.ts 관리자 키 검증 후 사진 수정(PATCH)/삭제(DELETE)
  api/photographers/route.ts 관리자 키 검증 후 작가 등록
  api/photographers/[id]/route.ts 관리자 키 검증 후 작가 수정(PATCH)/삭제(DELETE, 사진은 연결만 해제)
  api/admin/verify/route.ts 관리자/업로드 페이지 진입용 키 검증
lib/
  supabase.ts              anon/admin 클라이언트, public URL 헬퍼
  exif.ts                  브라우저 EXIF 추출 (exifr)
  format.ts                촬영 정보 표시 포맷 유틸
  types.ts                 공용 타입 (Photo, ExifData)
supabase/schema.sql        DB 테이블 + RLS 정책 + Storage 버킷 정의
```

## 아키텍처 원칙

- 사진 원본은 브라우저에서 Supabase Storage로 **직접 업로드**한다. Vercel 요청 크기 제한(4.5MB)을 피하기 위함이며, 서버는 서명 URL 발급만 담당한다.
- 쓰기(업로드, 레코드 생성)는 반드시 서버 API에서 `ADMIN_UPLOAD_KEY`를 검증한 뒤에만 허용한다. 클라이언트에서 Supabase에 직접 쓰기 요청을 보내지 않는다.
- `photos` 테이블은 RLS로 읽기(select)만 공개하고, anon 키로는 쓰기가 불가능하다. 쓰기는 `SUPABASE_SERVICE_ROLE_KEY`를 쓰는 서버 코드에서만 수행한다.
- `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_UPLOAD_KEY`는 서버 전용 환경 변수이며 `NEXT_PUBLIC_` 접두사를 붙이지 않는다.
- Vercel 무료 이미지 최적화 한도를 아끼기 위해 사진 렌더링에는 `next/image` 대신 `<img>`를 의도적으로 사용한다. (`eslint.config.mjs`에서 관련 규칙은 warning으로 유지)

## Lint & 코드 작성 가이드

### Lint

- `npm run lint` — ESLint (`eslint-config-next` + `@typescript-eslint`) 실행
- `npm run typecheck` — `tsc --noEmit`으로 타입 오류 확인
- 코드를 수정한 뒤에는 커밋 전에 두 명령을 모두 통과시킨다.
- 새 규칙이 필요하면 `eslint.config.mjs`의 `rules`에 추가하고, 이유를 주석으로 남긴다.

### TypeScript / ES6 문법 가이드

- **`var` 금지, `let`/`const` 사용.** 재할당이 없으면 항상 `const`를 사용한다. (`no-var`, `prefer-const` 규칙으로 강제)
- **화살표 함수를 기본으로 사용**한다. 콜백, 유틸 함수는 `function` 키워드 대신 화살표 함수로 작성한다. (React 컴포넌트 정의는 `function` 선언 유지)
- **템플릿 리터럴**을 문자열 연결(`+`)보다 우선 사용한다.
- **구조 분해 할당**을 적극 활용한다 (`const { data, error } = await ...`).
- **스프레드/레스트 문법**을 `Object.assign`, `arguments` 대신 사용한다.
- **`async/await`를 사용**하고, `.then()` 체이닝은 지양한다. Promise 에러는 `try/catch`로 처리한다.
- **`import`/`export` (ES 모듈)만 사용**한다. `require`는 사용하지 않는다.
- **동등 비교는 `===`/`!==`만 사용**한다 (`eqeqeq` 규칙). `null` 체크 등 의도적인 경우에만 예외를 허용한다.
- **타입은 명시적으로 선언**한다. 함수의 파라미터와 반환 타입, 공용으로 쓰이는 데이터 구조(`lib/types.ts`)에는 타입을 생략하지 않는다. `any`는 사용하지 않고 불가피한 경우 `unknown` + 타입 가드로 좁힌다.
- **옵셔널 체이닝(`?.`)과 널 병합 연산자(`??`)**를 중첩 조건문 대신 사용한다.
- 사용하지 않는 변수는 제거한다. 의도적으로 무시하는 인자는 `_`로 시작한다 (`@typescript-eslint/no-unused-vars`의 `argsIgnorePattern` 참고).
- 서버 전용 코드(관리자 키, service role 클라이언트)와 클라이언트 코드(`"use client"`)를 명확히 분리하고, 서버 전용 모듈을 클라이언트 컴포넌트에서 import하지 않는다.
