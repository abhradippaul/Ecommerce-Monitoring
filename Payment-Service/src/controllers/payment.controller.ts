import type { Request, Response } from 'express';
import logger from '../utils/logger.js';
import { withHttpSpan } from '../utils/traces.js';
import { recordPaymentOperation } from '../utils/metrics.js';

export const createPayment = async (req: Request, res: Response) => {
  await withHttpSpan('createPayment', req, res, async span => {
    const traceId = span.spanContext().traceId;
    logger.info('Create payment requested', { trace_id: traceId });
    // TODO: implement payment creation logic
    recordPaymentOperation('create_payment', 'success');
    res.status(201).json({
      message: 'Payment created successfully',
      data: null,
    });
  });
};

export const getPayment = async (req: Request, res: Response) => {
  await withHttpSpan('getPayment', req, res, async span => {
    const traceId = span.spanContext().traceId;
    const { id } = req.params;
    logger.info('Get payment requested', { trace_id: traceId, paymentId: id });
    // TODO: implement get payment logic
    recordPaymentOperation('get_payment', 'success');
    res.status(200).json({
      message: 'Successfully fetched payment',
      data: null,
    });
  });
};

export const listPayments = async (req: Request, res: Response) => {
  await withHttpSpan('listPayments', req, res, async span => {
    const traceId = span.spanContext().traceId;
    logger.info('List payments requested', { trace_id: traceId });
    // TODO: implement list payments logic
    recordPaymentOperation('list_payments', 'success');
    res.status(200).json({
      message: 'Successfully fetched payments',
      data: [],
    });
  });
};

export const refundPayment = async (req: Request, res: Response) => {
  await withHttpSpan('refundPayment', req, res, async span => {
    const traceId = span.spanContext().traceId;
    const { id } = req.params;
    logger.info('Refund payment requested', { trace_id: traceId, paymentId: id });
    // TODO: implement refund logic
    recordPaymentOperation('refund_payment', 'success');
    res.status(200).json({
      message: 'Payment refunded successfully',
      data: null,
    });
  });
};
