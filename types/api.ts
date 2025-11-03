// Types étendus pour les données API avec relations incluses
import type { Message, Recipient, Identity, SendAttempt, SmtpAccount } from '@prisma/client';

export interface MessageWithRelations extends Omit<Message, 'identity'> {
  identity?: Pick<Identity, 'displayName' | 'fromEmail'> | null;
  recipients?: RecipientWithRelations[];
}

export interface RecipientWithRelations extends Omit<Recipient, 'sendAttempts' | 'smtpAccount'> {
  sendAttempts?: SendAttempt[];
  smtpAccount?: Pick<SmtpAccount, 'provider'> | null;
}

export interface HistoryResponse {
  messages: MessageWithRelations[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}
