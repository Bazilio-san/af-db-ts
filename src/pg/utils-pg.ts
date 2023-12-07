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
  _bit: 'bit',
  _bool: 'bool',
  _box: 'box',
  _bytea: 'bytea',
  _char: 'char',
  _circle: 'circle',
  _date: 'date',
  _float4: 'real',
  _float8: 'double precision',
  _inet: 'inet',
  _int2: 'smallint',
  _int4: 'int',
  _int8: 'bigint',
  _interval: 'interval',
  _lseg: 'lseg',
  _macaddr: 'macaddr',
  _money: 'money',
  _numeric: 'numeric',
  _path: 'path',
  _point: 'point',
  _polygon: 'polygon',
  _text: 'text',
  _time: 'time',
  _timestamp: 'timestamp',
  _timestamptz: 'timestamptz',
  _timetz: 'timetz',
  _uuid: 'uuid',
  _varchar: 'varchar',
  _xml: 'xml',
  // _oid: 'oid',
  // _abstime: 'abstime',
  // _name: 'name',
};
export const getTypeByUdtNamePg = (udtName: TArrayTypesPg): TDataTypePg => {
  const dataType = udtNames2TypeMap[udtName];
  return dataType || 'varchar';
};

const typeNormalizationMap: { [pgDataType: string]: TDataTypePg } = {
  bool: 'boolean',
  int2: 'smallint',
  integer: 'int',
  int4: 'int',
  int8: 'bigint',
  serial2: 'smallserial',
  serial4: 'serial',
  serial8: 'bigserial',
  decimal: 'numeric',
  float4: 'real',
  float8: 'double precision',
  character: 'char',
  'character varying': 'varchar',
  'timestamp with time zone': 'timestamptz',
  'timestamp without time zone': 'timestamp',
  'time without time zone': 'time',
  'time with time zone': 'timetz',
  'bit varying': 'varbit',
};

export const getNormalizedTypePg = (pgDataType: TDataTypePg): TDataTypePg => typeNormalizationMap[pgDataType] || pgDataType;
