export type TDataTypePg =
  'bit' | // bit[(n)] - fixed-length bit string
  'bool' |
  'boolean' |

  'smallint' |
  'int2' | // VVQ

  'int' |
  'integer' |
  'int4' | // VVQ

  'bigint' |
  'int8' |

  'smallserial' | // VVQ
  'serial2' | // VVQ

  'serial' | // VVQ
  'serial4' | // VVQ

  'bigserial' | // VVQ
  'serial8' | // VVQ

  'numeric' | // numeric [(p,s)]
  'decimal' | // decimal [(p,s)] // VVQ

  'real' |
  'float4' |

  'money' | // VVQ

  'double precision' | // VVQ
  'float8' | // VVQ

  'json' |
  'jsonb' |

  'character' | // character[(n)]  // VVQ
  'char' | // character[(n)]  // VVQ

  'varchar' | // varchar[(n)]
  'character varying' | // character varying[(n)] // VVQ

  'string' | // Искусственный
  'text' |

  'uuid' |

  'bytea' | // VVQ

  'timestamptz' | // timestamp [(p)] with time zone
  'timestamp with time zone]' |
  'timestamp' | // timestamp [(p)] [without time zone]
  'timestamp without time zone' |

  'date' |

  'time' | // time [(p)]
  'time without time zone' | // time [(p)] without time zone // VVQ
  'timetz' |
  'time with time zone' | // time [(p)] with time zone // VVQ

  'ARRAY' |
  'USER_DEFINED' |

  // Не задействованы
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

  '_char' | // VVQ
  '_oid' | // VVQ
  '_abstime' | // VVQ
  '_bytea' | // VVQ

  '_name' |
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
