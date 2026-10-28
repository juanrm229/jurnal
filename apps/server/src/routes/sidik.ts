/** SIDIK: permainan detektif bersama. Lihat rooms.ts untuk mekanisme ruang. */
import { sidik } from '@sehari/core';
import type { Services } from '../context';
import { schema } from '../db';
import { roomRoutes } from './rooms';

export const sidikRoutes = (s: Services) => roomRoutes<sidik.Game, sidik.Action>(s, sidik, schema.sidikRooms, 'sidik');
