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
