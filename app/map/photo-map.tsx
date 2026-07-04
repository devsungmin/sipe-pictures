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

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function popupHtml(photo: MapPhoto): string {
  const title = escapeHtml(photo.title ?? "무제");
  return `
    <a href="/photos/${photo.id}" style="display:block;width:180px;text-decoration:none;color:inherit;">
      <img src="${photo.imageUrl}" alt="${title}" loading="lazy"
        style="width:180px;height:120px;object-fit:cover;border-radius:8px;display:block;" />
      <div style="margin-top:6px;font-size:13px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${title}</div>
    </a>`;
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

      const icon = L.divIcon({
        className: "",
        html: `<div style="width:34px;height:34px;border-radius:9999px;background:#111;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;font-size:16px;">📷</div>`,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
        popupAnchor: [0, -18],
      });

      const markers = photos.map((photo) =>
        L.marker([photo.latitude, photo.longitude], { icon })
          .addTo(map)
          .bindPopup(popupHtml(photo), { closeButton: false })
      );

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
