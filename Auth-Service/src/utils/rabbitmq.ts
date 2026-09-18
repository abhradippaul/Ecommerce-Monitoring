import amqp from 'amqplib';
import logger from './logger.js';
import { config } from './config.js';

let connection: amqp.ChannelModel | null = null;
let channel: amqp.Channel | null = null;

const getChannel = async (): Promise<amqp.Channel> => {
  if (channel) {
    return channel;
  }
  const rabbitmqUrl = config.rabbitmqUri;
  const conn = await amqp.connect(rabbitmqUrl);
  connection = conn;

  conn.on('error', (err: unknown) => {
    logger.error('RabbitMQ connection error:', err);
    channel = null;
    connection = null;
  });

  conn.on('close', () => {
    logger.warn('RabbitMQ connection closed');
    channel = null;
    connection = null;
  });

  const ch = await conn.createChannel();

  ch.on('error', (err: unknown) => {
    logger.error('RabbitMQ channel error:', err);
    channel = null;
  });

  ch.on('close', () => {
    channel = null;
  });

  channel = ch;
  return ch;
};

async function sendQueueMsg(queue: string, msg: string): Promise<void> {
  const ch = await getChannel();
  await ch.assertQueue(queue, {
    durable: true,
  });
  ch.sendToQueue(queue, Buffer.from(msg));
  logger.info(` [x] Sent message to ${queue}: ${msg}`);
}

export const closeRabbitMQ = async (): Promise<void> => {
  if (channel) {
    await channel.close().catch(() => {});
    channel = null;
  }
  if (connection) {
    await connection.close().catch(() => {});
    connection = null;
  }
};

export { sendQueueMsg, getChannel };
