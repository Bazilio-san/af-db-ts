DROP VIEW IF EXISTS test.v_hard_case;

CREATE VIEW test.v_hard_case
AS
SELECT *
FROM test.hard_case;

ALTER TABLE test.hard_case
    OWNER TO postgres;
