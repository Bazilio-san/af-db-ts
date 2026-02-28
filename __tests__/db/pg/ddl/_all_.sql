-- DROP TABLE IF EXISTS test.hard_case CASCADE;
DROP TABLE IF EXISTS test.hard_case;

CREATE TABLE IF NOT EXISTS test.hard_case
(
    ser1  serial not null,
    ser2  serial not null,
    i1  integer      not null,
    i2  integer      not null,

    i3  integer,
    i4  integer,

    i5  integer,
    i6  integer,

    i7  integer,
    i8  integer,
    permanent  boolean default FALSE,
    constraint pk__test__hard_case primary key (i1, i2),
    constraint ux__test__hard_case__i3_i4 unique (i3, i4),
    constraint ux__test__hard_case__i5_i6 unique (i5, i6)
);

COMMENT ON COLUMN test.hard_case."ser1" is 'Автоинкрементное поле ser1';

alter table test.hard_case
    owner to postgres;

create unique index uix__test__hard_case__i7_i8
    on test.hard_case (i7, i8);

insert into test.hard_case (i1, i2, i3, i4, i5, i6, i7, i8, permanent)
values  (1, 1, 2, 2, 3, 3, null, null, true),
        (2, 2, 3, 3, 4, 4, 5, 5, true);

-- DROP TABLE IF EXISTS test.only_one_serial CASCADE;
DROP TABLE IF EXISTS test.only_one_serial;

CREATE TABLE IF NOT EXISTS test.only_one_serial
(
    ser1      serial
        constraint pk__test__only_one_serial primary key,
    i1        integer NOT NULL,
    i2        integer,
    permanent boolean default FALSE,
    si        smallint,
    j         json,
    jb        jsonb,
    a_i       integer[],
    a_t       text[],
    a_b       boolean[],
    a_num     numeric(10, 5)[],
    a_real    integer[],
    a_f       double precision[],
    a_money   money[],
    a_vc      varchar(50)[],
    a_si      smallint[],
    a_time    time without time zone[],
    a_date    date[],
    a_ts      timestamp without time zone[],
    a_tz      timestamp with time zone[]
);

insert into test.only_one_serial (i1, i2, permanent)
values  (1, null, true),
        (2, 2, true);

-- DROP TABLE IF EXISTS test.only_one_uniq CASCADE;
DROP TABLE IF EXISTS test.only_one_uniq;

CREATE TABLE IF NOT EXISTS test.only_one_uniq
(
    i1        integer NOT NULL,
    i2        integer NOT NULL,
    i3        integer,
    i4        integer,
    permanent boolean default FALSE,
    constraint pk__test__only_one_uniq
        primary key (i1, i2)
);

insert into test.only_one_uniq (i1, i2, i3, i4, permanent)
values  (1, 1, null, null, true),
        (2, 2, 3, 4, true);

-- DROP TABLE IF EXISTS test.serial_and_uniq CASCADE;
DROP TABLE IF EXISTS test.serial_and_uniq;

CREATE TABLE IF NOT EXISTS test.serial_and_uniq
(
    ser1      serial
        constraint pk__test__serial_and_uniq primary key,
    i1        integer NOT NULL,
    i2        integer NOT NULL,
    i3        integer,
    i4        integer,
    permanent boolean default FALSE,
    constraint ux__test__serial_and_uniq__i3_i4
        unique (i1, i2)
);
insert into test.serial_and_uniq (i1, i2, i3, i4, permanent)
values  (1, 1, null, null, true),
        (2, 2, 3, 4, true);

-- DROP TABLE IF EXISTS test.table_schema CASCADE;
DROP TABLE IF EXISTS test.table_schema;

CREATE TABLE IF NOT EXISTS test.table_schema
(
    ser1      serial                                not null,
    ser2      serial                                not null,
    i1        integer     default ((25))            not null,
    i2        integer                                   null,
    si1       smallint,
    vc1       varchar(10)                           not null,
    dtz1      timestamptz(5) default CURRENT_TIMESTAMP not null,
    time1     time                                  not null,
    bool1     boolean     default TRUE              not null,
    bool2     boolean     default FALSE,
    arr_int   int[],
    arr_str   varchar[],
    "decimal" decimal,
    "numeric" numeric(7,5),
    "money" money,
    "real" real,
    "double_precision" double precision,
    "bytea" bytea,

    gen1 numeric GENERATED ALWAYS AS (i1 / 2.54) STORED,
    constraint pk__test__fable_schema primary key (i1, si1),
    constraint ux__test__fable_schema__vc_tz unique (vc1, dtz1)
);

COMMENT ON COLUMN test.table_schema."ser1" is 'Автоинкрементное поле ser1';

alter table test.table_schema
    owner to postgres;

create unique index uix__test__fable_schema__time1_bool1 on test.table_schema (time1, bool1);
create index ix__test__fable_schema__bool2 on test.table_schema (bool2);


DROP VIEW IF EXISTS test.v_hard_case;

CREATE VIEW test.v_hard_case
AS
SELECT *
FROM test.hard_case;

ALTER TABLE test.hard_case
    OWNER TO postgres;
