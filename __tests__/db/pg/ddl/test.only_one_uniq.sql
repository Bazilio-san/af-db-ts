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
