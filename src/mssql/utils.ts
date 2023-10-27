/**
 * Оборачивает строку в одинарные кавычки, если второй аргумент не true
 */
export const q = (val: string, noQuotes?: boolean): string => (noQuotes ? val : `'${val}'`);

/**
 * Экранирование одинарной кавычки и символа % для использования строки в SQL запросе
 * onlySingleQuotes - true - не экранировать %
 */
export const mssqlEscape = (str: any, onlySingleQuotes: boolean = false): string => {
  if (str == null) {
    str = '';
  }
  switch (typeof str) {
    case 'number':
      str = String(str);
      break;
    case 'string':
      break;
    case 'boolean':
      str = str ? '1' : '0';
      break;
    default:
      str = String(str || '');
  }
  str = str.replace(/'/g, `''`);
  if (onlySingleQuotes) {
    return str;
  }
  return str.replace(/%/g, '%%');
};
