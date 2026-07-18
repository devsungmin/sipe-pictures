import { photoPublicUrl } from "@/lib/supabase";

/**
 * 원형 프로필 아바타. 이미지가 없으면 📷 아이콘으로 대체한다.
 * className에 크기(h-*, w-*)를, fallbackClassName에 대체 아이콘 글자 크기를 넘긴다.
 */
export default function Avatar({
  imagePath,
  alt,
  className,
  fallbackClassName = "text-sm",
}: {
  imagePath: string | null;
  alt: string;
  className: string;
  fallbackClassName?: string;
}) {
  if (imagePath) {
    return (
      // Vercel 이미지 최적화 무료 한도를 아끼기 위해 next/image 대신 img 사용
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoPublicUrl(imagePath)}
        alt={alt}
        loading="lazy"
        className={`shrink-0 rounded-full object-cover ${className}`}
      />
    );
  }
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full bg-white/10 ${fallbackClassName} ${className}`}
    >
      📷
    </span>
  );
}
