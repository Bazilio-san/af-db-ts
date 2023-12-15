export interface ITestTableSchemaRecord {
  ser1?: number,
  ser2?: number,
  i1?: number,
  i2?: number | null,
  si1: number,
  vc1: string,
  dtz1?: string | Date | number,
  time1: string | Date | number,
  bool1?: boolean,
  bool2?: boolean | null,
  arr_int?: string[] | null,
  arr_str?: string[] | null,
  decimal?: number | null,
  numeric?: number | null,
  money?: number | null,
  real?: number | null,
  double_precision?: number | null,
  bytea?: string | null,
  gen1?: number | null,
}
