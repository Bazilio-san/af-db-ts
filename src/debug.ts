import { Debug } from 'af-tools-ts';
import { bold, reset, magenta } from 'af-color';

export const debugX = Debug('user', {
  noTime: true,
  noPrefix: false,
  prefixColor: bold + magenta,
  messageColor: reset,
});
