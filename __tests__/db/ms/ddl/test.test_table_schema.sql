DROP TABLE IF EXISTS test.table_schema;

CREATE TABLE [test].[table_schema]
(
    [ser1]  [int] IDENTITY (1,1)                  NOT NULL,
    [i1]    [int]               default 123       NOT NULL,
    [i2]    [int]                                 NULL,
    [si1]   [smallint]                            NOT NULL,
    [vc1]   [varchar](20)       default 'aaa'     NOT NULL,
    [dtz1]  [datetimeoffset](3) default GETDATE() NOT NULL,
    [time1] [time](7)                             NULL,
    [bool1] [bit]               default 0         NOT NULL,
    [comp1] AS ([bool1]),
    [pers1] AS ([bool1]) PERSISTED NOT NULL,
    CONSTRAINT [pk__test__table_schema] PRIMARY KEY CLUSTERED (i1, si1),
    CONSTRAINT [ux__test__table_schema__vc_tz] UNIQUE NONCLUSTERED (vc1, dtz1),
);
create unique index uix__test__table_schema__time1_bool1 on test.table_schema (time1, bool1);
create index ix__test__table_schema__permanent on test.table_schema (pers1);


