/** ULAR TANGGA (Ruang Main): klasik & jenius. Lihat rooms.ts untuk mekanisme ruang. */
import { tangga } from '@sehari/core';
import type { Services } from '../context';
import { schema } from '../db';
import { roomRoutes } from './rooms';

export const tanggaRoutes = (s: Services) => roomRoutes<tangga.Game, tangga.Action>(s, tangga, schema.gameRooms, 'tangga');
