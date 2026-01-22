interface IAsLogger {
  error: Function,
}

export const logger: IAsLogger = console as IAsLogger;

export const setLogger = (logger_: any) => {
  logger.error = logger_.error.bind(logger_);
};
