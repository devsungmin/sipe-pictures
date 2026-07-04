import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getSupabaseAnon,
  isSupabaseConfigured,
  photoPublicUrl,
} from "@/lib/supabase";
import {
  cameraLabel,
  formatAperture,
  formatExposureTime,
  formatFocalLength,
  formatIso,
  formatTakenAt,
} from "@/lib/format";
import type { Photo } from "@/lib/types";

export const dynamic = "force-dynamic";

function MetaItem({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="rounded-lg bg-white/5 px-4 py-3">
      <dt className="text-xs text-neutral-400">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-neutral-100">{value}</dd>
    </div>
  );
}

export default async function PhotoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!isSupabaseConfigured()) notFound();

  const { id } = await params;
  const supabase = getSupabaseAnon();
  const { data: photo } = (await supabase
    .from("photos")
    .select("*")
    .eq("id", id)
    .maybeSingle()) as { data: Photo | null };

  if (!photo) notFound();

  const hasLocation = photo.latitude != null && photo.longitude != null;
  const settings = [
    formatFocalLength(photo.focal_length),
    formatAperture(photo.aperture),
    formatExposureTime(photo.exposure_time),
    formatIso(photo.iso),
  ].filter(Boolean) as string[];

  return (
    <div className="space-y-8">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-neutral-400 hover:text-white"
      >
        ← 갤러리로 돌아가기
      </Link>

      <figure className="overflow-hidden rounded-2xl border border-white/10 bg-black">
        <img
          src={photoPublicUrl(photo.storage_path)}
          alt={photo.title ?? "SIPE 출사 사진"}
          className="mx-auto max-h-[80vh] w-auto"
        />
      </figure>

      <div>
        <h1 className="text-2xl font-semibold">{photo.title ?? "무제"}</h1>
        {photo.description && (
          <p className="mt-2 whitespace-pre-wrap text-neutral-300">
            {photo.description}
          </p>
        )}
        {photo.uploader && (
          <p className="mt-2 text-sm text-neutral-500">
            올린 사람: {photo.uploader}
          </p>
        )}
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-400">
          촬영 정보
        </h2>
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          <MetaItem
            label="카메라"
            value={cameraLabel(photo.camera_make, photo.camera_model)}
          />
          <MetaItem label="렌즈" value={photo.lens_model} />
          <MetaItem label="촬영 일시" value={formatTakenAt(photo.taken_at)} />
          <MetaItem
            label="설정"
            value={settings.length > 0 ? settings.join(" · ") : null}
          />
          <MetaItem
            label="해상도"
            value={
              photo.width && photo.height
                ? `${photo.width} × ${photo.height}`
                : null
            }
          />
        </dl>
        {!cameraLabel(photo.camera_make, photo.camera_model) &&
          settings.length === 0 &&
          !photo.taken_at && (
            <p className="text-sm text-neutral-500">
              이 사진에는 EXIF 메타데이터가 없습니다.
            </p>
          )}
      </section>

      {hasLocation && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-400">
            촬영 위치
          </h2>
          <div className="overflow-hidden rounded-2xl border border-white/10">
            <iframe
              title="촬영 위치 지도"
              src={`https://maps.google.com/maps?q=${photo.latitude},${photo.longitude}&z=15&hl=ko&output=embed`}
              className="h-96 w-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
          <a
            href={`https://www.google.com/maps?q=${photo.latitude},${photo.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-sm text-blue-400 hover:underline"
          >
            구글 지도에서 크게 보기 ↗
          </a>
        </section>
      )}
    </div>
  );
}
