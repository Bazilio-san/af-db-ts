import { TDataTypePg, TArrayTypesPg } from '../@types/i-data-types-pg';

export const getJsTypeByTypePg = (dataType?: TDataTypePg, arrayType?: TDataTypePg): string => {
  switch (dataType) {
    case 'bit':
    case 'bool':
    case 'boolean':
      return 'boolean';

    case 'bigint':
      return 'string | number';

    case 'smallint':
    case 'int2':
    case 'int':
    case 'integer':
    case 'int4':
    case 'int8':
    case 'numeric':
    case 'decimal':
    case 'real':
    case 'float4':
    case 'money':
    case 'double precision':
    case 'float8':
      return 'number';

    case 'smallserial':
    case 'serial2':
    case 'serial':
    case 'serial4':
    case 'bigserial':
    case 'serial8':
      return 'number';

    case 'character':
    case 'char':
    case 'varchar':
    case 'character varying':
    case 'string':
    case 'text':
    case 'uuid':
    case 'xml':
      return 'string';

    case 'bytea':
      return 'string';

    case 'json':
    case 'jsonb':
      return 'any';

    case 'date':
    case 'time':
    case 'timestamptz':
    case 'timestamp with time zone':
    case 'timestamp':
    case 'timestamp without time zone':
    case 'time without time zone':
    case 'timetz':
    case 'time with time zone':
      return 'string | Date | number';

    case 'USER_DEFINED':
      return 'string';

    // Не задействованы
    case 'bit varying':
    case 'varbit':
    case 'box': // rectangular box on a plane
    case 'cidr': // IPv4 or IPv6 network address
    case 'circle': // circle on a plane
    case 'inet': // IPv4 or IPv6 host address
    case 'line': // infinite line on a plane
    case 'interval': // interval [fields][(p)] // time span
    case 'lseg': // line segment on a plane
    case 'macaddr': // MAC (Media Access Control) address
    case 'macaddr8': // MAC (Media Access Control) address (EUI-64 format)
    case 'path': // geometric path on a plane
    case 'pg_lsn': // PostgreSQL Log Sequence Number
    case 'pg_snapshot': // user-level transaction ID snapshot
    case 'point': // geometric point on a plane
    case 'polygon': // closed geometric path on a plane
    case 'tsquery': // text search query
    case 'tsvector': // text search document
    case 'txid_snapshot': // user-level transaction ID snapshot (deprecated; see pg_snapshot)
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
