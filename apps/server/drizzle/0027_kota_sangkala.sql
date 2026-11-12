-- Kota pindah dari peta Lirih ke peta Sangkala buatan sendiri. Rumah di peta lama
-- dilepas (persilnya tidak ada lagi) dan naskahnya diarsipkan: tetap tersimpan,
-- hanya terbaca oleh penulisnya.
UPDATE "manuscripts" SET "visibility" = 'arsip' WHERE "id" IN (SELECT "ms_id" FROM "city_claims" WHERE "city" = 'lirih');--> statement-breakpoint
UPDATE "city_claims" SET "status" = 'dilepas' WHERE "city" = 'lirih';
