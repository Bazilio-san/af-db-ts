import { echo } from 'af-echo-ts';

interface IAsLogger {
  error: Function,
}

export const logger: IAsLogger = echo as IAsLogger;

export const setLogger = (logger_: any) => {
  logger.error = logger_.error.bind(logger_);
};
