import { config } from '../utils/config.js';

export class InfoService {
  getInfo() {
    return {
      name: config.appName,
      version: '1.0.0',
      description: 'Payment Processing Service for NodeJS Monitoring Application',
      environment: process.env.NODE_ENV || 'development',
    };
  }
}

export const infoService = new InfoService();
