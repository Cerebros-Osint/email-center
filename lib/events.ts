import { EventEmitter } from 'events';
import { logger } from './logger';

export interface EmailEvent {
  type: 'sent' | 'failed' | 'received' | 'suppressed' | 'unsubscribed';
  orgId: string;
  data: unknown;
  timestamp: Date;
}

class EventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(100);
  }
  
  emitEmailEvent(event: EmailEvent): void {
    logger.debug({ event }, 'Email event emitted');
    this.emit('email', event);
    this.emit(event.type, event);
  }
}

export const eventBus = new EventBus();

// Event listeners can be registered like:
// eventBus.on('sent', (event) => { ... });
// eventBus.on('failed', (event) => { ... });
