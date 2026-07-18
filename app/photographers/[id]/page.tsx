import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getSupabaseAnon,
  isSupabaseConfigured,
  photoPublicUrl,
} from "@/lib/supabase";
import type { Photo, Photographer } from "@/lib/types";
import ScrollReveal from "@/components/scroll-reveal";
import PhotoCard from "@/components/photo-card";
import Avatar from "@/components/avatar";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  if (!isSupabaseConfigured()) return {};
  const { id } = await params;
  const supabase = getSupabaseAnon();
  const { data: photographer } = (await supabase
    .from("photographers")
    .select("*")
    .eq("id", id)
    .maybeSingle()) as { data: Photographer | null };
  if (!photographer) return {};

  const title = `${photographer.name} 작가`;
  const description =
    photographer.skills ?? "SIPE 출사 모임에서 활동 중인 작가";
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      ...(photographer.profile_image_path
        ? { images: [{ url: photoPublicUrl(photographer.profile_image_path) }] }
        : {}),
    },
  };
}

export default async function PhotographerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!isSupabaseConfigured()) notFound();

  const { id } = await params;
  const supabase = getSupabaseAnon();

  const { data: photographer } = (await supabase
    .from("photographers")
    .select("*")
    .eq("id", id)
    .maybeSingle()) as { data: Photographer | null };

  if (!photographer) notFound();

  const { data: photos } = (await supabase
    .from("photos")
    .select("*")
    .eq("photographer_id", id)
    .order("taken_at", { ascending: false, nullsFirst: false })) as {
    data: Photo[] | null;
  };

  const photoList = photos ?? [];

  return (
    <div className="space-y-10">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-neutral-400 hover:text-white"
      >
        ← 갤러리로 돌아가기
      </Link>

      {/* 작가 프로필 */}
      <ScrollReveal>
        <section className="flex flex-col items-center gap-5 rounded-2xl border border-white/10 bg-white/5 p-8 text-center sm:flex-row sm:text-left">
          <Avatar
            imagePath={photographer.profile_image_path}
            alt={photographer.name}
            className="h-28 w-28 border-2 border-white/20"
            fallbackClassName="text-4xl"
          />
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold">
              {photographer.name}
              {photographer.nickname && (
                <span className="ml-2 text-base font-normal text-neutral-400">
                  {photographer.nickname}
                </span>
              )}
            </h1>
            {photographer.skills && (
              <p className="mt-2 text-sm text-neutral-300">
                {photographer.skills}
              </p>
            )}
            <p className="mt-2 flex flex-wrap items-center justify-center gap-x-4 text-sm text-neutral-400 sm:justify-start">
              <span>사진 {photoList.length}장</span>
              {photographer.email && (
                <a
                  href={`mailto:${photographer.email}`}
                  className="text-blue-400 hover:underline"
                >
                  {photographer.email}
                </a>
              )}
              {photographer.sns_url && (
                <a
                  href={photographer.sns_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline"
                >
                  SNS ↗
                </a>
              )}
            </p>
          </div>
        </section>
      </ScrollReveal>

      {/* 작가가 올린 사진 */}
      <section>
        <h2 className="mb-4 text-lg font-semibold">올린 사진</h2>
        {photoList.length === 0 ? (
          <p className="py-12 text-center text-neutral-400">
            아직 올린 사진이 없어요.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {photoList.map((photo, i) => (
              // 작가 본인 페이지이므로 카드의 작가 표시는 생략한다.
              <PhotoCard
                key={photo.id}
                photo={photo}
                delay={Math.min(i, 8) * 70}
                showPhotographer={false}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
