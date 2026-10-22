/**
 * Kota untuk zona waktu, senja, dan "Dua Sisi Satu Hari".
 * Lokasi paling detail yang pernah dibagikan adalah nama kota, tidak pernah titik.
 * Koordinat dibulatkan; cukup untuk jam senja dan cuaca harian.
 */

export interface City {
  id: string;
  name: string;
  province: string;
  /** Kode negara ISO-3166 alpha-2. */
  country: string;
  tz: string;
  lat: number;
  lon: number;
}

type Row = [id: string, name: string, province: string, lat: number, lon: number, tz?: string];

const WIB = 'Asia/Jakarta';
const WITA = 'Asia/Makassar';
const WIT = 'Asia/Jayapura';

const ID_ROWS: Row[] = [
  // Sumatra
  ['banda-aceh', 'Banda Aceh', 'Aceh', 5.55, 95.32],
  ['lhokseumawe', 'Lhokseumawe', 'Aceh', 5.18, 97.15],
  ['medan', 'Medan', 'Sumatera Utara', 3.59, 98.67],
  ['pematangsiantar', 'Pematangsiantar', 'Sumatera Utara', 2.96, 99.06],
  ['padang', 'Padang', 'Sumatera Barat', -0.95, 100.35],
  ['bukittinggi', 'Bukittinggi', 'Sumatera Barat', -0.3, 100.37],
  ['pekanbaru', 'Pekanbaru', 'Riau', 0.51, 101.45],
  ['dumai', 'Dumai', 'Riau', 1.67, 101.45],
  ['batam', 'Batam', 'Kepulauan Riau', 1.13, 104.05],
  ['tanjungpinang', 'Tanjungpinang', 'Kepulauan Riau', 0.92, 104.45],
  ['jambi', 'Jambi', 'Jambi', -1.61, 103.61],
  ['palembang', 'Palembang', 'Sumatera Selatan', -2.98, 104.76],
  ['pangkalpinang', 'Pangkalpinang', 'Kepulauan Bangka Belitung', -2.13, 106.11],
  ['bengkulu', 'Bengkulu', 'Bengkulu', -3.8, 102.27],
  ['bandar-lampung', 'Bandar Lampung', 'Lampung', -5.43, 105.26],
  ['metro', 'Metro', 'Lampung', -5.11, 105.31],
  // Jawa
  ['jakarta', 'Jakarta', 'DKI Jakarta', -6.2, 106.82],
  ['bogor', 'Bogor', 'Jawa Barat', -6.6, 106.8],
  ['depok', 'Depok', 'Jawa Barat', -6.4, 106.82],
  ['bekasi', 'Bekasi', 'Jawa Barat', -6.24, 106.99],
  ['bandung', 'Bandung', 'Jawa Barat', -6.92, 107.61],
  ['cimahi', 'Cimahi', 'Jawa Barat', -6.87, 107.54],
  ['cirebon', 'Cirebon', 'Jawa Barat', -6.73, 108.55],
  ['tasikmalaya', 'Tasikmalaya', 'Jawa Barat', -7.33, 108.22],
  ['sukabumi', 'Sukabumi', 'Jawa Barat', -6.92, 106.93],
  ['karawang', 'Karawang', 'Jawa Barat', -6.32, 107.34],
  ['tangerang', 'Tangerang', 'Banten', -6.18, 106.63],
  ['tangerang-selatan', 'Tangerang Selatan', 'Banten', -6.29, 106.72],
  ['serang', 'Serang', 'Banten', -6.12, 106.15],
  ['cilegon', 'Cilegon', 'Banten', -6.0, 106.05],
  ['semarang', 'Semarang', 'Jawa Tengah', -6.97, 110.42],
  ['solo', 'Solo', 'Jawa Tengah', -7.57, 110.82],
  ['magelang', 'Magelang', 'Jawa Tengah', -7.48, 110.22],
  ['salatiga', 'Salatiga', 'Jawa Tengah', -7.33, 110.5],
  ['purwokerto', 'Purwokerto', 'Jawa Tengah', -7.42, 109.23],
  ['tegal', 'Tegal', 'Jawa Tengah', -6.87, 109.14],
  ['pekalongan', 'Pekalongan', 'Jawa Tengah', -6.89, 109.68],
  ['kudus', 'Kudus', 'Jawa Tengah', -6.8, 110.84],
  ['yogyakarta', 'Yogyakarta', 'DI Yogyakarta', -7.8, 110.36],
  ['sleman', 'Sleman', 'DI Yogyakarta', -7.72, 110.36],
  ['surabaya', 'Surabaya', 'Jawa Timur', -7.25, 112.75],
  ['malang', 'Malang', 'Jawa Timur', -7.98, 112.63],
  ['batu', 'Batu', 'Jawa Timur', -7.87, 112.52],
  ['sidoarjo', 'Sidoarjo', 'Jawa Timur', -7.45, 112.72],
  ['kediri', 'Kediri', 'Jawa Timur', -7.82, 112.01],
  ['madiun', 'Madiun', 'Jawa Timur', -7.63, 111.52],
  ['jember', 'Jember', 'Jawa Timur', -8.17, 113.7],
  ['banyuwangi', 'Banyuwangi', 'Jawa Timur', -8.22, 114.37],
  ['probolinggo', 'Probolinggo', 'Jawa Timur', -7.75, 113.22],
  ['blitar', 'Blitar', 'Jawa Timur', -8.1, 112.17],
  ['gresik', 'Gresik', 'Jawa Timur', -7.16, 112.65],
  // Kalimantan
  ['pontianak', 'Pontianak', 'Kalimantan Barat', -0.03, 109.33, 'Asia/Pontianak'],
  ['singkawang', 'Singkawang', 'Kalimantan Barat', 0.91, 108.98, 'Asia/Pontianak'],
  ['palangka-raya', 'Palangka Raya', 'Kalimantan Tengah', -2.21, 113.92, 'Asia/Pontianak'],
  ['sampit', 'Sampit', 'Kalimantan Tengah', -2.53, 112.95, 'Asia/Pontianak'],
  ['banjarmasin', 'Banjarmasin', 'Kalimantan Selatan', -3.32, 114.59, WITA],
  ['banjarbaru', 'Banjarbaru', 'Kalimantan Selatan', -3.44, 114.83, WITA],
  ['balikpapan', 'Balikpapan', 'Kalimantan Timur', -1.27, 116.83, WITA],
  ['samarinda', 'Samarinda', 'Kalimantan Timur', -0.5, 117.15, WITA],
  ['bontang', 'Bontang', 'Kalimantan Timur', 0.13, 117.5, WITA],
  ['nusantara', 'Nusantara (IKN)', 'Kalimantan Timur', -0.97, 116.7, WITA],
  ['tarakan', 'Tarakan', 'Kalimantan Utara', 3.3, 117.63, WITA],
  ['tanjung-selor', 'Tanjung Selor', 'Kalimantan Utara', 2.84, 117.37, WITA],
  // Bali & Nusa Tenggara
  ['denpasar', 'Denpasar', 'Bali', -8.65, 115.22, WITA],
  ['ubud', 'Ubud', 'Bali', -8.51, 115.26, WITA],
  ['singaraja', 'Singaraja', 'Bali', -8.11, 115.09, WITA],
  ['mataram', 'Mataram', 'Nusa Tenggara Barat', -8.58, 116.12, WITA],
  ['bima', 'Bima', 'Nusa Tenggara Barat', -8.46, 118.73, WITA],
  ['kupang', 'Kupang', 'Nusa Tenggara Timur', -10.18, 123.6, WITA],
  ['labuan-bajo', 'Labuan Bajo', 'Nusa Tenggara Timur', -8.5, 119.88, WITA],
  ['maumere', 'Maumere', 'Nusa Tenggara Timur', -8.62, 122.21, WITA],
  ['ende', 'Ende', 'Nusa Tenggara Timur', -8.84, 121.66, WITA],
  // Sulawesi
  ['makassar', 'Makassar', 'Sulawesi Selatan', -5.15, 119.43, WITA],
  ['parepare', 'Parepare', 'Sulawesi Selatan', -4.01, 119.62, WITA],
  ['palopo', 'Palopo', 'Sulawesi Selatan', -3.0, 120.2, WITA],
  ['manado', 'Manado', 'Sulawesi Utara', 1.47, 124.84, WITA],
  ['bitung', 'Bitung', 'Sulawesi Utara', 1.44, 125.19, WITA],
  ['tomohon', 'Tomohon', 'Sulawesi Utara', 1.32, 124.84, WITA],
  ['gorontalo', 'Gorontalo', 'Gorontalo', 0.54, 123.06, WITA],
  ['palu', 'Palu', 'Sulawesi Tengah', -0.9, 119.87, WITA],
  ['kendari', 'Kendari', 'Sulawesi Tenggara', -3.97, 122.51, WITA],
  ['baubau', 'Baubau', 'Sulawesi Tenggara', -5.47, 122.62, WITA],
  ['mamuju', 'Mamuju', 'Sulawesi Barat', -2.68, 118.89, WITA],
  // Maluku & Papua
  ['ambon', 'Ambon', 'Maluku', -3.7, 128.18, WIT],
  ['tual', 'Tual', 'Maluku', -5.63, 132.75, WIT],
  ['ternate', 'Ternate', 'Maluku Utara', 0.79, 127.38, WIT],
  ['sofifi', 'Sofifi', 'Maluku Utara', 0.73, 127.57, WIT],
  ['jayapura', 'Jayapura', 'Papua', -2.53, 140.72, WIT],
  ['sentani', 'Sentani', 'Papua', -2.57, 140.51, WIT],
  ['merauke', 'Merauke', 'Papua Selatan', -8.49, 140.4, WIT],
  ['nabire', 'Nabire', 'Papua Tengah', -3.37, 135.49, WIT],
  ['timika', 'Timika', 'Papua Tengah', -4.55, 136.89, WIT],
  ['wamena', 'Wamena', 'Papua Pegunungan', -4.1, 138.95, WIT],
  ['manokwari', 'Manokwari', 'Papua Barat', -0.86, 134.06, WIT],
  ['sorong', 'Sorong', 'Papua Barat Daya', -0.88, 131.26, WIT],
  ['fakfak', 'Fakfak', 'Papua Barat', -2.93, 132.3, WIT],
];

// Tempat perantau Indonesia di luar negeri.
const WORLD: City[] = [
  { id: 'kuala-lumpur', name: 'Kuala Lumpur', province: 'Malaysia', country: 'MY', tz: 'Asia/Kuala_Lumpur', lat: 3.14, lon: 101.69 },
  { id: 'johor-bahru', name: 'Johor Bahru', province: 'Malaysia', country: 'MY', tz: 'Asia/Kuala_Lumpur', lat: 1.49, lon: 103.74 },
  { id: 'singapura', name: 'Singapura', province: 'Singapura', country: 'SG', tz: 'Asia/Singapore', lat: 1.35, lon: 103.82 },
  { id: 'bandar-seri-begawan', name: 'Bandar Seri Begawan', province: 'Brunei', country: 'BN', tz: 'Asia/Brunei', lat: 4.9, lon: 114.94 },
  { id: 'bangkok', name: 'Bangkok', province: 'Thailand', country: 'TH', tz: 'Asia/Bangkok', lat: 13.76, lon: 100.5 },
  { id: 'manila', name: 'Manila', province: 'Filipina', country: 'PH', tz: 'Asia/Manila', lat: 14.6, lon: 120.98 },
  { id: 'hong-kong', name: 'Hong Kong', province: 'Hong Kong', country: 'HK', tz: 'Asia/Hong_Kong', lat: 22.32, lon: 114.17 },
  { id: 'taipei', name: 'Taipei', province: 'Taiwan', country: 'TW', tz: 'Asia/Taipei', lat: 25.03, lon: 121.56 },
  { id: 'taichung', name: 'Taichung', province: 'Taiwan', country: 'TW', tz: 'Asia/Taipei', lat: 24.15, lon: 120.67 },
  { id: 'tokyo', name: 'Tokyo', province: 'Jepang', country: 'JP', tz: 'Asia/Tokyo', lat: 35.68, lon: 139.69 },
  { id: 'osaka', name: 'Osaka', province: 'Jepang', country: 'JP', tz: 'Asia/Tokyo', lat: 34.69, lon: 135.5 },
  { id: 'seoul', name: 'Seoul', province: 'Korea Selatan', country: 'KR', tz: 'Asia/Seoul', lat: 37.57, lon: 126.98 },
  { id: 'busan', name: 'Busan', province: 'Korea Selatan', country: 'KR', tz: 'Asia/Seoul', lat: 35.18, lon: 129.08 },
  { id: 'beijing', name: 'Beijing', province: 'Tiongkok', country: 'CN', tz: 'Asia/Shanghai', lat: 39.9, lon: 116.4 },
  { id: 'shanghai', name: 'Shanghai', province: 'Tiongkok', country: 'CN', tz: 'Asia/Shanghai', lat: 31.23, lon: 121.47 },
  { id: 'dili', name: 'Dili', province: 'Timor Leste', country: 'TL', tz: 'Asia/Dili', lat: -8.56, lon: 125.57 },
  { id: 'jeddah', name: 'Jeddah', province: 'Arab Saudi', country: 'SA', tz: 'Asia/Riyadh', lat: 21.49, lon: 39.19 },
  { id: 'mekkah', name: 'Mekkah', province: 'Arab Saudi', country: 'SA', tz: 'Asia/Riyadh', lat: 21.39, lon: 39.86 },
  { id: 'madinah', name: 'Madinah', province: 'Arab Saudi', country: 'SA', tz: 'Asia/Riyadh', lat: 24.47, lon: 39.61 },
  { id: 'riyadh', name: 'Riyadh', province: 'Arab Saudi', country: 'SA', tz: 'Asia/Riyadh', lat: 24.71, lon: 46.68 },
  { id: 'dubai', name: 'Dubai', province: 'Uni Emirat Arab', country: 'AE', tz: 'Asia/Dubai', lat: 25.2, lon: 55.27 },
  { id: 'doha', name: 'Doha', province: 'Qatar', country: 'QA', tz: 'Asia/Qatar', lat: 25.29, lon: 51.53 },
  { id: 'kairo', name: 'Kairo', province: 'Mesir', country: 'EG', tz: 'Africa/Cairo', lat: 30.04, lon: 31.24 },
  { id: 'istanbul', name: 'Istanbul', province: 'Turki', country: 'TR', tz: 'Europe/Istanbul', lat: 41.01, lon: 28.98 },
  { id: 'amsterdam', name: 'Amsterdam', province: 'Belanda', country: 'NL', tz: 'Europe/Amsterdam', lat: 52.37, lon: 4.9 },
  { id: 'den-haag', name: 'Den Haag', province: 'Belanda', country: 'NL', tz: 'Europe/Amsterdam', lat: 52.08, lon: 4.3 },
  { id: 'leiden', name: 'Leiden', province: 'Belanda', country: 'NL', tz: 'Europe/Amsterdam', lat: 52.16, lon: 4.49 },
  { id: 'berlin', name: 'Berlin', province: 'Jerman', country: 'DE', tz: 'Europe/Berlin', lat: 52.52, lon: 13.4 },
  { id: 'muenchen', name: 'München', province: 'Jerman', country: 'DE', tz: 'Europe/Berlin', lat: 48.14, lon: 11.58 },
  { id: 'paris', name: 'Paris', province: 'Prancis', country: 'FR', tz: 'Europe/Paris', lat: 48.86, lon: 2.35 },
  { id: 'london', name: 'London', province: 'Inggris', country: 'GB', tz: 'Europe/London', lat: 51.51, lon: -0.13 },
  { id: 'sydney', name: 'Sydney', province: 'Australia', country: 'AU', tz: 'Australia/Sydney', lat: -33.87, lon: 151.21 },
  { id: 'melbourne', name: 'Melbourne', province: 'Australia', country: 'AU', tz: 'Australia/Melbourne', lat: -37.81, lon: 144.96 },
  { id: 'perth', name: 'Perth', province: 'Australia', country: 'AU', tz: 'Australia/Perth', lat: -31.95, lon: 115.86 },
  { id: 'darwin', name: 'Darwin', province: 'Australia', country: 'AU', tz: 'Australia/Darwin', lat: -12.46, lon: 130.84 },
  { id: 'auckland', name: 'Auckland', province: 'Selandia Baru', country: 'NZ', tz: 'Pacific/Auckland', lat: -36.85, lon: 174.76 },
  { id: 'new-york', name: 'New York', province: 'Amerika Serikat', country: 'US', tz: 'America/New_York', lat: 40.71, lon: -74.01 },
  { id: 'los-angeles', name: 'Los Angeles', province: 'Amerika Serikat', country: 'US', tz: 'America/Los_Angeles', lat: 34.05, lon: -118.24 },
  { id: 'san-francisco', name: 'San Francisco', province: 'Amerika Serikat', country: 'US', tz: 'America/Los_Angeles', lat: 37.77, lon: -122.42 },
  { id: 'toronto', name: 'Toronto', province: 'Kanada', country: 'CA', tz: 'America/Toronto', lat: 43.65, lon: -79.38 },
];

export const CITIES: City[] = [
  ...ID_ROWS.map(([id, name, province, lat, lon, tz]) => ({ id, name, province, country: 'ID', tz: tz ?? WIB, lat, lon })),
  ...WORLD,
];

export const CITY_BY_ID: Record<string, City> = Object.fromEntries(CITIES.map((c) => [c.id, c]));

export function getCity(id: string | null | undefined): City | undefined {
  return id ? CITY_BY_ID[id] : undefined;
}

export const PROVINCES: string[] = [...new Set(ID_ROWS.map((r) => r[2]))].sort();

/** Jarak lingkaran besar (km). */
export function distanceKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/**
 * Kota terdekat dari koordinat perangkat. Dihitung di perangkat; koordinatnya
 * sendiri tidak pernah dikirim ke server.
 */
export function nearestCity(lat: number, lon: number): City {
  let best = CITIES[0]!;
  let bestD = Infinity;
  for (const c of CITIES) {
    const d = distanceKm({ lat, lon }, c);
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return best;
}

export function searchCities(query: string, limit = 12): City[] {
  const q = query.trim().toLowerCase();
  if (!q) return CITIES.slice(0, limit);
  const starts: City[] = [];
  const contains: City[] = [];
  for (const c of CITIES) {
    const n = c.name.toLowerCase();
    if (n.startsWith(q)) starts.push(c);
    else if (n.includes(q) || c.province.toLowerCase().includes(q)) contains.push(c);
  }
  return [...starts, ...contains].slice(0, limit);
}
