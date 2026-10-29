/** KEMBANG API (Ruang Main): kooperatif ala Hanabi. Lihat rooms.ts untuk mekanisme ruang. */
import { hanabi } from '@sehari/core';
import type { Services } from '../context';
import { schema } from '../db';
import { roomRoutes } from './rooms';

export const hanabiRoutes = (s: Services) => roomRoutes<hanabi.Game, hanabi.Action>(s, hanabi, schema.gameRooms, 'hanabi');
