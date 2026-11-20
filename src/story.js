// Hikâye: Kaptan Bolt'un gemisi "Şimşek" düştü; her dünyanın boss'u bir parçayı koruyor.
export const SHIP_PARTS = [
  { ic: '🧭', name: 'Pusula' },
  { ic: '🔋', name: 'Yakıt Hücresi' },
  { ic: '❄️', name: 'Soğutucu' },
  { ic: '⚙️', name: 'Dişli Kutusu' },
  { ic: '📡', name: 'Anten' },
  { ic: '🌀', name: 'Işınlanma Çekirdeği' },
  { ic: '🛡️', name: 'Kalkan Jeneratörü' },
  { ic: '🔥', name: 'İtici' },
  { ic: '💾', name: 'Navigasyon Çipi' },
  { ic: '🚀', name: 'Ana Motor' },
];
/** Toplanan parça sayısı: yenilen boss sayısı */
export const partsHave = (d) => SHIP_PARTS.filter((_, i) => (d.stars[(i + 1) * 35] || 0) > 0).length;
export const partHas = (d, i) => (d.stars[(i + 1) * 35] || 0) > 0;

export const STORY_HTML = `
  <div class="emoji">🚀</div>
  <h2>Kaptan Bolt'un Macerası</h2>
  <p>Kaptan Bolt'un uzay gemisi <b>Şimşek</b>, bir fırtınada bilinmeyen bir gezegene düştü. Gemi <b>10 parçaya</b> ayrıldı ve her parça farklı bir dünyaya dağıldı.</p>
  <p>Her dünyanın sonunda bir <b>boss</b>, bir parçayı koruyor. Bastığın kareler arkandan çöküyor; her hamleni iyi düşün!</p>
  <p>Parçaları topla, gemiyi tamir et ve Kaptan Bolt'u eve götür!</p>`;
