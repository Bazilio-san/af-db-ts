-- DROP TABLE IF EXISTS test.table_schema CASCADE;
DROP TABLE IF EXISTS test.table_schema;

CREATE TABLE IF NOT EXISTS test.table_schema
(
  ser1      serial                                not null,
  ser2      serial                                not null,
  i1        integer     default ((25))            not null,
  si1       smallint,
  vc1       varchar(20)                           not null,
  dtz1      timestamptz default CURRENT_TIMESTAMP not null,
  time1     time                                  not null,
  bool1     boolean                               not null,
  bool2     boolean     default FALSE,
  gen1 numeric GENERATED ALWAYS AS (i1 / 2.54) STORED,
  constraint pk__test__fable_schema primary key (i1, si1),
  constraint ux__test__fable_schema__vc_tz unique (vc1, dtz1)
);

alter table test.table_schema
  owner to postgres;

create unique index uix__test__fable_schema__time1_bool1 on test.table_schema (time1, bool1);
create index ix__test__fable_schema__bool2 on test.table_schema (bool2);


