import axios from 'axios';

export interface WebhookPayload {
  id: string;
  url: string;
  data: unknown;
  retryCount: number;
}

interface DLQEntry extends WebhookPayload {
  failedAt: Date;
  lastError: string;
}

const MAX_RETRIES = 5;
const INITIAL_DELAY = 1000; // 1 second

// export class WebhookService {
//   private dlq: DLQEntry[] = []; // In production, this would be a DB table or Redis list

//   /**
//    * Sends a webhook with exponential backoff
//    */
//   async send(payload: WebhookPayload): Promise<void> {
//     try {
//       await axios.post(payload.url, payload.data, {
//         headers: { 'Content-Type': 'application/json' }
//       });
//       console.log(`Webhook ${payload.id} delivered successfully.`);
//     } catch (error: any) {
//       if (payload.retryCount < MAX_RETRIES) {
//         const delay = INITIAL_DELAY * Math.pow(2, payload.retryCount);
//         payload.retryCount++;

//         console.warn(`Webhook ${payload.id} failed. Retrying in ${delay}ms...`);
//         setTimeout(() => this.send(payload), delay);
//       } else {
//         this.handleToDLQ(payload, error.message);
//       }
//     }
//   }

//   private handleToDLQ(payload: WebhookPayload, error: string) {
//     const entry: DLQEntry = {
//       ...payload,
//       failedAt: new Date(),
//       lastError: error,
//     };
//     this.dlq.push(entry);
//     console.error(`Webhook ${payload.id} moved to DLQ. Reason: ${error}`);
//   }

//   getDLQ() {
//     return this.dlq;
//   }
// }


export class WebhookService {
  private dlq: DLQEntry[] = [];
  private pendingTimers: Map<string, NodeJS.Timeout> = new Map();

  async send(payload: WebhookPayload): Promise<void> {
    try {
      await axios.post(payload.url, payload.data, {
        headers: { 'Content-Type': 'application/json' }
      });
      console.log(`Webhook ${payload.id} delivered successfully.`);
      // Clear timer if it exists
      this.clearTimer(payload.id);
    } catch (error: any) {
      if (payload.retryCount < MAX_RETRIES) {
        const delay = INITIAL_DELAY * Math.pow(2, payload.retryCount);
        payload.retryCount++;

        console.warn(`Webhook ${payload.id} failed. Retrying in ${delay}ms...`);

        // Store timer reference and unref it
        const timer = setTimeout(() => this.send(payload), delay);
        timer.unref(); // Allow process to exit even if timer is pending
        this.pendingTimers.set(payload.id, timer);
      } else {
        this.handleToDLQ(payload, error.message);
        this.clearTimer(payload.id);
      }
    }
  }

  private clearTimer(payloadId: string) {
    const timer = this.pendingTimers.get(payloadId);
    if (timer) {
      clearTimeout(timer);
      this.pendingTimers.delete(payloadId);
    }
  }

  private handleToDLQ(payload: WebhookPayload, error: string) {
    const entry: DLQEntry = {
      ...payload,
      failedAt: new Date(),
      lastError: error,
    };
    this.dlq.push(entry);
    console.error(`Webhook ${payload.id} moved to DLQ. Reason: ${error}`);
  }

  getDLQ() {
    return this.dlq;
  }
}