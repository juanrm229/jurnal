/** KUCING PETASAN (Ruang Main): jangan sampai meledak. Lihat rooms.ts untuk mekanisme ruang. */
import { petasan } from '@sehari/core';
import type { Services } from '../context';
import { schema } from '../db';
import { roomRoutes } from './rooms';

export const petasanRoutes = (s: Services) => roomRoutes<petasan.Game, petasan.Action>(s, petasan, schema.gameRooms, 'petasan');
