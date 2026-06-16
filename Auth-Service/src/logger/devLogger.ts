import winston from 'winston';
import { trace } from '@opentelemetry/api';
import { OpenTelemetryTransportV3 } from '@opentelemetry/winston-transport';

const logger = winston.createLogger({
    format: winston.format.combine(
        winston.format((info) => {
            const span = trace.getActiveSpan();
            if (span) {
                const spanContext = span.spanContext();
                info.trace_id = spanContext.traceId;
                info.span_id = spanContext.spanId;
                info.trace_flags = spanContext.traceFlags;
            }
            return info;
        })(),
        winston.format.json()
    ),
    transports: [
        new OpenTelemetryTransportV3()
    ]
});

const devLogger = () => {
    return logger;
};

export default devLogger;