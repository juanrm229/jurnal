/**
 * Data kecil yang ditampilkan widget layar utama. Ditulis aplikasi setiap kali
 * Hari Ini dimuat; widget tidak pernah memanggil server sendiri.
 * Isi Drop tidak ikut — hanya status, api, dan doodle hari terakhir.
 */
export interface WidgetSnapshot {
  updatedAt: string;
  day: string; // DayKey
  dayLabel: string; // "kamis"
  dateLabel: string; // "22.10"
  dayOfYear: number;
  sealedToday: boolean;
  doodle: string; // id doodle taman untuk hari terakhir yang tersegel
  circleName: string | null;
  streak: number;
  flame: 'fog' | 'ember' | 'dim' | 'warm' | 'bright';
  status: string; // "Naya sudah menyegel harinya." / "Segel harimu"
  year: number;
  sealedDays: number;
  daysLeft: number;
  /** 0/1 per hari tahun ini, untuk widget besar (taman titik). */
  garden: string;
}

export const WIDGET_KEY = 'widget.snapshot';
export const APP_GROUP = 'group.app.sehari';
