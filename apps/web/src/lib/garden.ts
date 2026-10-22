export { addDays, dayName } from '@sehari/core';
/** Benih doodle sama di semua perangkat untuk hari & pemilik yang sama. */
export const gardenSeedFor = (ownerId: string, day: string) => `${ownerId}:${day}`;
