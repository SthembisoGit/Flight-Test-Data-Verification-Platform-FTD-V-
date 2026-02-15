import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('returns healthy payload', () => {
    const controller = new HealthController();
    const payload = controller.getHealth();
    expect(payload.status).toBe('ok');
    expect(typeof payload.timestamp).toBe('string');
  });
});
