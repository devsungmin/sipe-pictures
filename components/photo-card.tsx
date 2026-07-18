import Link from "next/link";
import { photoThumbUrl } from "@/lib/supabase";
import { cameraLabel, formatTakenAt } from "@/lib/format";
import type { Photo, Photographer } from "@/lib/types";
import ScrollReveal from "./scroll-reveal";
import Avatar from "./avatar";

type CardPhoto = Photo & { photographer?: Photographer | null };

/**
 * 갤러리·앨범·작가 페이지에서 공용으로 쓰는 사진 카드.
 * 4:3 고정 비율 썸네일 + 제목 + (선택) 작가 아바타 + 촬영 정보.
 */
export default function PhotoCard({
  photo,
  delay = 0,
  showPhotographer = true,
}: {
  photo: CardPhoto;
  delay?: number;
  showPhotographer?: boolean;
}) {
  const camera = cameraLabel(photo.camera_make, photo.camera_model);
  const takenAt = formatTakenAt(photo.taken_at);
  const photographerName = photo.photographer?.name ?? photo.uploader;

  return (
    <ScrollReveal delay={delay}>
      <Link
        href={`/photos/${photo.id}`}
        className="group block overflow-hidden rounded-xl border border-white/10 bg-white/5 transition-all duration-300 hover:-translate-y-1 hover:border-white/25 hover:shadow-xl hover:shadow-black/40"
      >
        {/* 가로/세로 사진이 섞여도 정돈되어 보이도록 카드 비율을 4:3으로 고정하고 잘라서 보여준다. 원본 비율은 상세 페이지에서 확인. */}
        <div className="aspect-[4/3] overflow-hidden">
          {/* Vercel 이미지 최적화 무료 한도를 아끼기 위해 next/image 대신 img 사용 */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoThumbUrl(photo)}
            alt={photo.title ?? "SIPE 출사 사진"}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          />
        </div>
        <div className="px-4 py-3 text-sm">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate font-medium text-neutral-100">
              {photo.title ?? "무제"}
            </p>
            {showPhotographer && photographerName && (
              <span className="flex shrink-0 items-center gap-1.5 text-xs text-neutral-300">
                <Avatar
                  imagePath={photo.photographer?.profile_image_path ?? null}
                  alt={photographerName}
                  className="h-5 w-5"
                  fallbackClassName="text-[10px]"
                />
                {photographerName}
              </span>
            )}
          </div>
          <p className="mt-1 flex flex-wrap gap-x-2 text-xs text-neutral-400">
            {camera && <span>{camera}</span>}
            {takenAt && <span>{takenAt}</span>}
            {photo.latitude != null && photo.longitude != null && (
              <span>📍 위치 정보</span>
            )}
          </p>
        </div>
      </Link>
    </ScrollReveal>
  );
}
