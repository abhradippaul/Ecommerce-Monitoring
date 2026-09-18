export class HealthService {
  getHealthStatus() {
    return {
      status: 'UP',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }
}

export const healthService = new HealthService();
