/** TITIP SURAT (Ruang Main): permainan kartu deduksi. Lihat rooms.ts untuk mekanisme ruang. */
import { surat } from '@sehari/core';
import type { Services } from '../context';
import { schema } from '../db';
import { roomRoutes } from './rooms';

export const suratRoutes = (s: Services) => roomRoutes<surat.Game, surat.Action>(s, surat, schema.gameRooms, 'surat');
