import * as sql from 'mssql';

export type TDataTypeMs =
  typeof sql.VarChar |
  typeof sql.NVarChar |
  typeof sql.Text |
  typeof sql.Int |
  typeof sql.BigInt |
  typeof sql.TinyInt |
  typeof sql.SmallInt |
  typeof sql.Bit |
  typeof sql.Float |
  typeof sql.Numeric |
  typeof sql.Decimal |
  typeof sql.Real |
  typeof sql.Date |
  typeof sql.DateTime |
  typeof sql.DateTime2 |
  typeof sql.DateTimeOffset |
  typeof sql.SmallDateTime |
  typeof sql.Time |
  typeof sql.UniqueIdentifier |
  typeof sql.SmallMoney |
  typeof sql.Money |
  typeof sql.Binary |
  typeof sql.VarBinary |
  typeof sql.Image |
  typeof sql.Xml |
  typeof sql.Char |
  typeof sql.NChar |
  typeof sql.NText |
  typeof sql.TVP |
  typeof sql.UDT |
  typeof sql.Geography |
  typeof sql.Geometry |
  typeof sql.Variant |
  'bool' |
  'boolean' |
  'bit' |
  'tinyint' |
  'smallint' |
  'int' |
  'integer' |
  'bigint' |

  'number' |
  'decimal' |
  'float' |
  'money' |
  'numeric' |
  'smallmoney' |
  'real' |

  'json' |

  'string' |
  'char' |
  'nchar' |
  'text' |
  'ntext' |
  'varchar' |
  'nvarchar' |
  'xml' |

  'uid' |
  'uuid' |
  'uniqueIdentifier' |
  'datetime' |
  'datetime2' |
  'date' |
  'time' |
  'smalldatetime' |
  'datetimeoffset' |
  'binary' |
  'varbinary' |
  'image' |
  'udt' |
  'geography' |
  'geometry' |
  'variant' |
  'array'
