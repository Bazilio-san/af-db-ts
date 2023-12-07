import * as sql from 'mssql';
import { TDataTypeMs } from '../@types/i-data-types-ms';

export const getJsTypeByTypeMs = (dataType?: TDataTypeMs, arrayType?: TDataTypeMs): string => {
  switch (dataType) {
    case 'boolean':
    case sql.Bit:
      return 'boolean';

    case 'bigint':
    case sql.BigInt:
      return 'string | number';

    case 'tinyint':
    case sql.TinyInt:
    case 'smallint':
    case sql.SmallInt:
    case 'int':
    case 'integer':
    case sql.Int:
    case 'number':
    case sql.Decimal:
    case sql.Float:
    case sql.Money:
    case sql.Numeric:
    case sql.SmallMoney:
    case sql.Real:
      return 'number';

    case 'string':
    case sql.Char:
    case sql.NChar:
    case sql.Text:
    case sql.NText:
    case sql.VarChar:
    case sql.NVarChar:
    case sql.Xml:
    case 'uid':
    case 'uuid':
    case 'uniqueIdentifier':
    case sql.UniqueIdentifier:
      return 'string';

    case 'datetime':
    case 'date':
    case 'time':
    case sql.DateTime:
    case sql.DateTime2:
    case sql.Time:
    case sql.Date:
    case sql.SmallDateTime:
    case sql.DateTimeOffset:
      return 'string | Date | number';

    case sql.Binary:
    case sql.VarBinary:
    case sql.Image:
      return 'any';

    case sql.UDT:
    case sql.Geography:
    case sql.Geometry:
    case sql.Variant:
      return 'any';
    case 'array': {
      const jsType = getJsTypeByTypeMs(arrayType);
      return `${jsType}[]`;
    }
    default:
      return 'string';
  }
};
