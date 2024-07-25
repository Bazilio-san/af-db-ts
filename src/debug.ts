import { Debug } from 'af-tools-ts';
import { bold, reset, magenta } from 'af-color';

export const debugX = Debug('af-db-ts', {
  noTime: true,
  noPrefix: false,
  prefixColor: bold + magenta,
  messageColor: reset,
});
