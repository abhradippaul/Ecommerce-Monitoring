import { Redis } from 'ioredis';
import { config } from './config.js';

const valkey = new Redis({
    host: config.valkeyHost,
    port: config.valkeyPort,
});

export default valkey;