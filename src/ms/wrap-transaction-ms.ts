/**
 * Оборачивает инструкции SQL в транзакцию
 */
export const wrapTransactionMs = (strSQL: string): string => `BEGIN TRY
    BEGIN TRANSACTION;

    ${strSQL}

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    DECLARE @ErrorMessage  NVARCHAR(MAX)
          , @ErrorSeverity INT
          , @ErrorState    INT;

    SELECT
        @ErrorMessage = ERROR_MESSAGE() + ' Line ' + CAST(ERROR_LINE() AS NVARCHAR(5))
      , @ErrorSeverity = ERROR_SEVERITY()
      , @ErrorState = ERROR_STATE();

    IF @@trancount > 0
    BEGIN
        ROLLBACK TRANSACTION;
    END;

    RAISERROR(@ErrorMessage, @ErrorSeverity, @ErrorState);
END CATCH;`;
