create table "test"."table_schema"
(
    "ser1" int not null, -- Автоинкрементное поле ser1
    "ser2" int not null,
    "i1" int not null,
    "i2" int,
    "si1" smallint not null,
    "vc1" varchar not null,
    "dtz1" timestamptz not null,
    "time1" time not null,
    "bool1" boolean not null,
    "bool2" boolean,
    "arr_int" ARRAY,
    "arr_str" ARRAY,
    "decimal" numeric,
    "numeric" numeric,
    "money" money,
    "real" real,
    "double_precision" double precision,
    "bytea" bytea,
    "gen1" numeric
);
