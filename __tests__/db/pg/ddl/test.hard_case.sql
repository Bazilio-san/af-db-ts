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
