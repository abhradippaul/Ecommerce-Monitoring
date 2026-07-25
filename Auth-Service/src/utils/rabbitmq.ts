import amqp from 'amqplib';
const connection = await amqp.connect('amqp://kalo:kalo@localhost');
const channel = await connection.createChannel();

async function sendQueueMsg(queue: string, msg: string) {
    await channel.assertQueue(queue, {
        durable: true,
        arguments: {
            'x-queue-type': 'quorum'
        }
    });
    channel.sendToQueue(queue, Buffer.from(msg));
    console.log(" [x] Sent %s", msg);
    await channel.close();
    await connection.close();
}

export { sendQueueMsg }