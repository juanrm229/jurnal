/** SEBELUM DISEGEL: arsip berlapis dengan aplikasi sebagai moderator. */
import { segel } from '@sehari/core';
import type { Services } from '../context';
import { schema } from '../db';
import { roomRoutes } from './rooms';

export const segelRoutes = (s: Services) => roomRoutes<segel.Game, segel.Action>(s, segel, schema.segelRooms, 'segel');
