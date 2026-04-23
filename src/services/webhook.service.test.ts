import { WebhookService } from './webhook.service';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('WebhookService', () => {
  it('moves a repeatedly failing delivery to the DLQ after max retries (fake timers)', async () => {
    jest.useFakeTimers();
    try {
      mockedAxios.post.mockRejectedValue(new Error('Network Error'));

      const service = new WebhookService();
      const payload = {
        id: '123',
        url: 'http://test.com',
        data: {},
        retryCount: 0,
      };

      const sendOp = service.send(payload);

      for (let i = 0; i < 20; i += 1) {
        await jest.runOnlyPendingTimersAsync();
      }

      await sendOp;

      expect(service.getDLQ().length).toBe(1);
      expect(service.getDLQ()[0].id).toBe('123');
    } finally {
      jest.useRealTimers();
    }
  });
});
