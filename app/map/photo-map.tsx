"use client";

import { useEffect, useRef } from "react";
import type { Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";

export interface MapPhoto {
  id: string;
  title: string | null;
  imageUrl: string;
  latitude: number;
  longitude: number;
}

interface LocationGroup {
  lat: number;
  lng: number;
  photos: MapPhoto[];
}

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/** 좌표 소수 4자리(약 11m) 기준으로 같은 위치의 사진을 묶는다. */
function groupByLocation(photos: MapPhoto[]): LocationGroup[] {
  const groups = new Map<string, MapPhoto[]>();
  for (const photo of photos) {
    const key = `${photo.latitude.toFixed(4)},${photo.longitude.toFixed(4)}`;
    const group = groups.get(key);
    if (group) {
      group.push(photo);
    } else {
      groups.set(key, [photo]);
    }
  }
  return [...groups.values()].map((group) => ({
    // 마커는 그룹 좌표의 평균 지점에 찍는다.
    lat: group.reduce((sum, p) => sum + p.latitude, 0) / group.length,
    lng: group.reduce((sum, p) => sum + p.longitude, 0) / group.length,
    photos: group,
  }));
}

/** 마커 아이콘 — 그룹에서 랜덤으로 고른 사진 1장을 썸네일로 쓰고, 여러 장이면 장수 배지를 단다. */
function markerHtml(group: LocationGroup): string {
  const representative =
    group.photos[Math.floor(Math.random() * group.photos.length)];
  const count = group.photos.length;
  const alt = escapeHtml(representative.title ?? "SIPE 출사 사진");
  return `
    <div style="position:relative;width:52px;height:52px;">
      <img src="${representative.imageUrl}" alt="${alt}" loading="lazy"
        style="width:52px;height:52px;object-fit:cover;border-radius:12px;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.5);display:block;" />
      ${
        count > 1
          ? `<span style="position:absolute;top:-7px;right:-7px;background:#111;color:#fff;border:1.5px solid #fff;border-radius:9999px;font-size:11px;font-weight:600;line-height:1;padding:3px 6px;">${count}</span>`
          : ""
      }
    </div>`;
}

function popupHtml(group: LocationGroup): string {
  if (group.photos.length === 1) {
    const photo = group.photos[0];
    const title = escapeHtml(photo.title ?? "무제");
    return `
      <a href="/photos/${photo.id}" style="display:block;width:180px;text-decoration:none;color:inherit;">
        <img src="${photo.imageUrl}" alt="${title}" loading="lazy"
          style="width:180px;height:120px;object-fit:cover;border-radius:8px;display:block;" />
        <div style="margin-top:6px;font-size:13px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${title}</div>
      </a>`;
  }

  const thumbs = group.photos
    .map((photo) => {
      const title = escapeHtml(photo.title ?? "무제");
      return `
        <a href="/photos/${photo.id}" title="${title}" style="display:block;">
          <img src="${photo.imageUrl}" alt="${title}" loading="lazy"
            style="width:100%;height:70px;object-fit:cover;border-radius:6px;display:block;" />
        </a>`;
    })
    .join("");
  return `
    <div style="width:210px;">
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:6px;max-height:230px;overflow-y:auto;">${thumbs}</div>
      <div style="margin-top:8px;font-size:12px;color:#555;">이 위치의 사진 ${group.photos.length}장</div>
    </div>`;
}

export default function PhotoMap({ photos }: { photos: MapPhoto[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // Leaflet은 window에 의존하므로 브라우저에서만 로드한다.
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current || mapRef.current) return;

      const map = L.map(containerRef.current, { scrollWheelZoom: true }).setView(
        [36.5, 127.8], // 한반도 중심 (마커가 없을 때의 기본 화면)
        7
      );
      mapRef.current = map;

      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      const markers = groupByLocation(photos).map((group) => {
        const icon = L.divIcon({
          className: "",
          html: markerHtml(group),
          iconSize: [52, 52],
          iconAnchor: [26, 26],
          popupAnchor: [0, -30],
        });
        return L.marker([group.lat, group.lng], { icon })
          .addTo(map)
          .bindPopup(popupHtml(group), { closeButton: false });
      });

      if (markers.length > 0) {
        const bounds = L.featureGroup(markers).getBounds().pad(0.2);
        map.fitBounds(bounds, { maxZoom: 15 });
      }
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [photos]);

  return (
    <div
      ref={containerRef}
      // sticky 헤더(z-10) 아래에 깔리도록 자체 스태킹 컨텍스트를 만든다.
      className="relative z-0 h-[70vh] w-full overflow-hidden rounded-2xl border border-white/10"
    />
  );
}
