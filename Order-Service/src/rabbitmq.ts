import amqp from 'amqplib';
import logger from './utils/logger.js';
import { config } from './utils/config.js';
import { cartService } from './services/cart.service.js';
import { userCreatedEventSchema } from './schemas/events.schema.js';

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

const processUserCreated = async (payload: unknown): Promise<void> => {
  const parseResult = userCreatedEventSchema.safeParse(payload);
  if (!parseResult.success) {
    logger.warn('User-created payload verification failed:', {
      errors: parseResult.error.issues,
      payload,
    });
    return;
  }

  const { userId } = parseResult.data;
  const cart = await cartService.createCart(userId);
  logger.info(`Successfully created cart for user ${userId}:`, { cartId: cart._id });
};

const parseMessageContent = (content: string): unknown => {
  try {
    return JSON.parse(content);
  } catch {
    return content;
  }
};

const runConsumer = async (): Promise<void> => {
  const ch = await getChannel();

  const handleMessage =
    (queue: string) =>
    async (message: amqp.ConsumeMessage | null): Promise<void> => {
      if (!message) {
        return;
      }

      try {
        const rawContent = message.content.toString();
        logger.info(`Received message from ${queue}: ${rawContent}`);
        const parsedMessage = parseMessageContent(rawContent);

        if (queue === 'user-created') {
          await processUserCreated(parsedMessage);
        } else {
          logger.info('Unknown queue:', queue);
        }

        ch.ack(message);
      } catch (error: unknown) {
        logger.error(`Error processing message from ${queue}:`, error);
        ch.ack(message);
      }
    };

  // Subscribing to user-created queue
  await ch.assertQueue('user-created', { durable: true });
  await ch.consume('user-created', handleMessage('user-created'));

  logger.info('Consumer is subscribed to queues: user-created');
};

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

export { sendQueueMsg, runConsumer, getChannel };
