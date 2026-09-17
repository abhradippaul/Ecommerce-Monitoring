import { createLogger, format, transports } from 'winston';
import { config } from '../utils/config.js';

const { combine, timestamp, json, errors } = format;

const devLogger = () => {
  return createLogger({
    level: config.logLevel,
    format: combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), errors({ stack: true }), json()),
    transports: [
      new transports.File({ filename: config.logFile }),
      new transports.File({ filename: config.errorFile, level: 'error' }),
      new transports.Console(), // ONLY PRINTING LOGS IN TERMINAL
    ],
  });
};

// const elasticTransport = (spanTracerId, indexPrefix) => {
//     const esTransportOpts = {
//         level: 'debug',
//         indexPrefix,
//         indexSuffixPattern: 'YYYY-MM-DD',
//         transformer: (logData) => {
//             const spanId = spanTracerId;
//             return {
//                 '@timestamp': new Date(),
//                 severity: logData.level,
//                 stack: logData.meta.stack,
//                 service_name: packagejson.name,
//                 service_version: packagejson.version,
//                 message: `${logData.message}`,
//                 data: JSON.stringify(logData.meta.data),
//                 span_id: spanId,
//                 utcTimestamp: logData.timestamp
//             };
//         },
//         clientOpts: {
//             node: 'http://localhost:9200',
//             maxRetries: 5,
//             requestTimeout: 10000,
//             sniffOnStart: false,
//             auth: {
//                 username: ENV.ELASTIC_USER,
//                 password: ENV.ELASTIC_PASSWORD,
//             },
//         },
//     };
//     return esTransportOpts;
// };

export default devLogger;
