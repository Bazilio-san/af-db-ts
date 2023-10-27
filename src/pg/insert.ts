// noinspection SqlResolve
import { QueryResultRow } from 'pg';
import { omitBy } from 'af-tools-ts';
import { getFieldsAndValuesPg, getTableSchemaPg } from './table-schema';
import { queryPg } from './query-pg';
import { logger } from '../logger-error';

export enum EUpdateLevel {
  NEVER_UPDATE,
  UPDATE_IF_NOT_FOUND,
  UPDATE_ALWAYS
}

const hasAllValues = <T extends QueryResultRow> (fieldList: string[] | undefined, record: T) => fieldList?.length && fieldList.every((f) => record[f] !== undefined);

const selectByAnyIdentity = async <T extends QueryResultRow, R extends QueryResultRow = T> (
  connectionId: string,
  identities: string[][],
  record: T,
  source: string,
): Promise<R | undefined> => {
  const identityAlternativesArr: string[] = [];
  let pos = 0;
  const positionValues: any[] = [];
  identities.forEach((identityFieldList) => {
    if (hasAllValues(identityFieldList, record)) {
      identityAlternativesArr.push(identityFieldList.map((f) => `${f} = $${positionValues.push(record[f]) && ++pos}`).join(' AND '));
    }
  });
  let selectSql: string = '';
  if (identityAlternativesArr.length) {
    const identityWhere = identityAlternativesArr.map((v) => `( ${v} )`).join(' OR ');
    selectSql = `SELECT *
                 FROM ${source}
                 WHERE ${identityWhere}`;
    const result = await queryPg<R>(connectionId, selectSql, positionValues);
    if (result?.rows?.[0]) {
      return result?.rows?.[0];
    }
  }
};

export const insertPg = async <T extends QueryResultRow, R extends QueryResultRow = T> (
  {
    connectionId,
    record,
    target,
    source,
    isThrow,
    updateLevel,
  }: {
    connectionId: string,
    record: T,
    target: string, // schema And Table
    source?: string, // The schema and name of the table/view from which to return data. If not specified, target is used.
    isThrow?: boolean, // Flag: raise exception higher in case of error.
    updateLevel?: EUpdateLevel, // Flag: Update entry when unique constraints conflict.
  },
): Promise<R | undefined> => {
  const { recordSchema, pk = [], serials = [], uc = [] } = await getTableSchemaPg(connectionId, target);
  // Cleaning the record: deleting properties not included in the set of fields, with the value undefined and auto-incrementing fields
  const recordWoSerials: T = omitBy(record, (fieldValue: any, fieldName: string) => !recordSchema[fieldName] || fieldValue === undefined || serials.includes(fieldName)) as T;

  // We form all possible sets of fields, which we then use to search for an added (or already existing) record
  // Normalize (sort) sets
  let identities: string[][] = [pk, ...serials.map((f) => [f]), ...Object.values(uc)].filter((a) => a.length).map((a) => a.sort());
  // Removing duplicates
  identities = [...(new Set(identities.map((a) => a.join('|'))))].map((s) => s.split('|'));
  source = source || target;

  if (!updateLevel) {
    updateLevel = EUpdateLevel.NEVER_UPDATE;
  }

  let foundRow: R | undefined;
  try {
    if (updateLevel !== EUpdateLevel.UPDATE_ALWAYS) {
      // First, let's look for a suitable entry in the database if there are enough identification fields to search.
      // Most often, there are no identification fields among the inserted fields and are expected
      // appearance of an auto-incrementing identifier after insertion
      foundRow = await selectByAnyIdentity<T, R>(connectionId, identities, record, source);
      if (foundRow && updateLevel === EUpdateLevel.NEVER_UPDATE) {
        return foundRow;
      }
    }

    // There is no suitable record in the database, we insert it
    const { values, positionsList, fieldsList, upsertFields } = getFieldsAndValuesPg(recordWoSerials, recordSchema);
    const insertSQL = `INSERT INTO ${target} (${fieldsList})
                       VALUES (${positionsList}) ON CONFLICT ${
                               updateLevel === EUpdateLevel.NEVER_UPDATE
                                 ? 'DO NOTHING'
                                 : `(${pk.join(', ')}) DO UPDATE SET ${upsertFields}`
                       }
                           RETURNING *`;
    const result = await queryPg<R>(connectionId, insertSQL, values);
    const { rows = [] } = result || {};
    if (!rows[0] && !identities.length) {
      // Hard case
      logger.error(`The insert into table ${target} was not performed and there is no identification field set to search for an existing record.\nrecord: ${JSON.stringify(record)}`);
      return undefined;
    }
    // The insertion is done. Add auto-incrementing identifiers to the array of identification field sets
    const rowInserted = rows[0];
    const summaryRow = { ...recordWoSerials, ...rowInserted };
    foundRow = await selectByAnyIdentity<T, R>(connectionId, identities, summaryRow, source);
    if (foundRow) {
      return foundRow;
    }
    // If we could not find a record in the source by identifiers, we return what was returned after insertion.
    return summaryRow;
  } catch (err) {
    logger.error(err);
    if (isThrow) {
      throw err;
    }
  }
};
