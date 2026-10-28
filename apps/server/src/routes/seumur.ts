/** SEUMUR: menyusun satu kehidupan bersama tanpa bicara. Lihat rooms.ts untuk mekanisme ruang. */
import { seumur } from '@sehari/core';
import type { Services } from '../context';
import { schema } from '../db';
import { roomRoutes } from './rooms';

export const seumurRoutes = (s: Services) => roomRoutes<seumur.Game, seumur.Action>(s, seumur, schema.seumurRooms, 'seumur');
