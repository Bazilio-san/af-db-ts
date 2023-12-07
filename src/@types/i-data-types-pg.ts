export type TDataTypePg =
  'bit' | // bit[(n)] - fixed-length bit string
  'bool' |
  'boolean' |

  'smallint' |
  'int2' |

  'int' |
  'integer' |
  'int4' |

  'bigint' |
  'int8' |

  'numeric' | // numeric [(p,s)]
  'decimal' | // decimal [(p,s)]

  'real' | // 1E-37 to 1E+37 6 decimal digits precision
  'float4' |

  'money' |

  'double precision' |
  'float8' |

  'json' |
  'jsonb' |

  'character' | // character[(n)]
  'char' | // character[(n)]

  'varchar' | // varchar[(n)]
  'character varying' | // character varying[(n)]

  'string' | // Искусственный
  'text' |

  'uuid' |

  'bytea' |

  'timestamptz' | // timestamp [(p)] with time zone
  'timestamp with time zone' |
  'timestamp' | // timestamp [(p)] [without time zone]
  'timestamp without time zone' |

  'date' |

  'time' | // time [(p)]
  'time without time zone' | // time [(p)] without time zone
  'timetz' |
  'time with time zone' | // time [(p)] with time zone

  'ARRAY' |
  'USER_DEFINED' |

  // Не задействованы
  'smallserial' |
  'serial2' |
  'serial' |
  'serial4' |
  'bigserial' |
  'serial8' |
  'bit varying' | // varbit[(n)] / bit varying[(n)] - variable-length bit string
  'varbit' |
  'box' | // rectangular box on a plane
  'cidr' | // IPv4 or IPv6 network address
  'circle' | // circle on a plane
  'inet' | // IPv4 or IPv6 host address
  'interval' | // interval [fields][(p)] // time span
  'line' | // infinite line on a plane
  'lseg' | // line segment on a plane
  'macaddr' | // MAC (Media Access Control) address
  'macaddr8' | // MAC (Media Access Control) address (EUI-64 format)
  'path' | // geometric path on a plane
  'pg_lsn' | // PostgreSQL Log Sequence Number
  'pg_snapshot' | // user-level transaction ID snapshot
  'point' | // geometric point on a plane
  'polygon' | // closed geometric path on a plane
  'tsquery' | // text search query
  'tsvector' | // text search document
  'txid_snapshot' | // user-level transaction ID snapshot (deprecated; see pg_snapshot)
  'xml' // XML data

export type TArrayTypesPg =
  '_int2' |
  '_int4' |
  '_int8' |
  '_float4' |
  '_float8' |
  '_numeric' |
  '_money' |
  '_text' |
  '_varchar' |
  '_bool' |
  '_time' |
  '_date' |
  '_timestamp' |
  '_timestamptz' |

  '_char' |
  '_bytea' |
  '_bit' |
  '_inet' |
  '_macaddr' |
  '_point' |
  '_lseg' |
  '_path' |
  '_box' |
  '_circle' |
  '_polygon' |
  '_uuid' |
  '_xml' |
  '_interval' |
  '_timetz'
// Не ясно, откуда взялись
// '_oid' |
// '_abstime' |
// '_name' /
