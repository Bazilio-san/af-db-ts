INSERT INTO "test"."array_strings" ("id", "ct")
VALUES (
1, $s${"1","0","true","false",null,null,"2023-12-15T06:31:40.066Z","2023-12-15T06:31:40.066Z","2023-12-15T06:31:40.066Z","a\"b\"c'd'e\\f$$g"}$s$
)
,(
2, $s${"ООО \"Бодрый Бобёр\""}$s$
);

SELECT * FROM test.array_strings;
