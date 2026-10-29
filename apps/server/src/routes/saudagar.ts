/** SAUDAGAR (Ruang Main): jual-beli properti, aturan Monopoli resmi lengkap. Lihat rooms.ts untuk mekanisme ruang. */
import { saudagar } from '@sehari/core';
import type { Services } from '../context';
import { schema } from '../db';
import { roomRoutes } from './rooms';

export const saudagarRoutes = (s: Services) => roomRoutes<saudagar.Game, saudagar.Action>(s, saudagar, schema.gameRooms, 'saudagar');
