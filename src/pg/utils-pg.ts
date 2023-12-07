import { TDataTypePg, TArrayTypesPg } from '../@types/i-data-types-pg';

export const getJsTypeByTypePg = (dataType?: TDataTypePg, arrayType?: TDataTypePg): string => {
  switch (dataType) {
    case 'boolean':
      return 'boolean';
    case 'bigint':
      return 'string | number';
    case 'integer':
    case 'numeric':
    case 'real':
    case 'smallint':
      return 'number';
    case 'text':
    case 'character':
    case 'varchar':
    case 'uuid':
      return 'string';
    case 'json':
    case 'jsonb':
      return 'any';
    case 'date':
    case 'timestamptz':
    case 'timestamp':
      return 'string | Date | number';
    case 'USER_DEFINED':
      return 'string';
    case 'ARRAY': {
      const jsType = getJsTypeByTypePg(arrayType);
      return `${jsType}[]`;
    }
    default:
      return 'string';
  }
};

const udtNames2TypeMap: { [udtName: string]: TDataTypePg } = {
  _int2: 'smallint',
  _int4: 'int',
  _int8: 'bigint',
  _float8: 'double precision',
  _float4: 'real',
  _numeric: 'numeric',
  _money: 'money',
  _text: 'text',
  _varchar: 'varchar',
  _bool: 'bool',
  _time: 'time',
  _date: 'date',
  _timestamp: 'timestamp',
  _timestamptz: 'timestamptz',

  _char: 'char',
  _oid: 'oid',
  _abstime: 'abstime',
  _bytea: 'bytea',
  _name: 'name',
  _bit: 'bit',
  _inet: 'inet',
  _macaddr: 'macaddr',
  _point: 'point',
  _lseg: 'lseg',
  _path: 'path',
  _box: 'box',
  _circle: 'circle',
  _polygon: 'polygon',
  _uuid: 'uuid',
  _xml: 'xml',
  _interval: 'interval',
  _timetz: 'timetz',


};

export const getTypeByUdtNamePg = (udtName: TArrayTypesPg): TDataTypePg => {
  const dataType = udtNames2TypeMap[udtName];
  return dataType || 'varchar';
};
