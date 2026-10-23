// Rekam video tutorial: TUT_OUT=folder node e2e/tutorial/run.mjs [jumlah-bab]
import { CHAPTERS } from './chapters.mjs';
import { record } from './studio.mjs';

const n = Number(process.argv[2] || CHAPTERS.length);
await record(CHAPTERS.slice(0, n), { start: '/' });
