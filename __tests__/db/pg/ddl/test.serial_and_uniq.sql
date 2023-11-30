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
