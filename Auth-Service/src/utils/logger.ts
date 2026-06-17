import winston from 'winston';
import { OpenTelemetryTransportV3 } from '@opentelemetry/winston-transport';
import logsAPI from '@opentelemetry/api-logs';
import { config } from './config.js';
import {
  LoggerProvider,
  SimpleLogRecordProcessor,
  ConsoleLogRecordExporter,
} from '@opentelemetry/sdk-logs';

const loggerProvider = new LoggerProvider({
  processors: [new SimpleLogRecordProcessor(new ConsoleLogRecordExporter())],
});
logsAPI.logs.setGlobalLoggerProvider(loggerProvider);

const logger: winston.Logger = winston.createLogger({
  level: config.logLevel,
  transports: [
    new winston.transports.Console(),
    new OpenTelemetryTransportV3()
  ]
});

export default logger;
