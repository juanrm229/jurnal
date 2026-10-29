/** KARTU SATU (Ruang Main): cocokkan warna, aturan resmi + tongkrongan. Lihat rooms.ts untuk mekanisme ruang. */
import { satu } from '@sehari/core';
import type { Services } from '../context';
import { schema } from '../db';
import { roomRoutes } from './rooms';

export const satuRoutes = (s: Services) => roomRoutes<satu.Game, satu.Action>(s, satu, schema.gameRooms, 'satu');
