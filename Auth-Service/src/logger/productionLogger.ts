import { createLogger, format } from 'winston';
import { OpenTelemetryTransportV3 } from '@opentelemetry/winston-transport';
import { config } from '../utils/config.js';

const productionLogger = () => {
    return createLogger({
        level: config.logLevel,
        format: format.json(),
        transports: [
            new OpenTelemetryTransportV3()
        ]
    });
};

export default productionLogger;