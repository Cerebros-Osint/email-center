import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import type { ParsedMail } from 'mailparser';
import { prisma } from './db';
import { sanitizeEmailHtml } from './sanitize';
import { logger } from './logger';

export interface ImapConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

/**
 * Connect to IMAP server
 */
export async function createImapClient(): Promise<ImapFlow> {
  const config: ImapConfig = {
    host: process.env.IMAP_HOST || 'imap.gmail.com',
    port: parseInt(process.env.IMAP_PORT || '993'),
    secure: true,
    auth: {
      user: process.env.IMAP_USER || '',
      pass: process.env.IMAP_PASS || '',
    },
  };
  
  const client = new ImapFlow(config);
  await client.connect();
  
  return client;
}

/**
 * Poll IMAP for new messages
 */
export async function pollImap(orgId: string): Promise<number> {
  const client = await createImapClient();
  let processedCount = 0;
  
  try {
    // Lock mailbox for processing
    await client.mailboxOpen('INBOX');
    
    // Search for unseen messages
    const messages = client.fetch('1:*', {
      envelope: true,
      source: true,
      flags: true,
    });
    
    for await (const msg of messages) {
      try {
        const m = msg as { source?: string | Buffer; body?: string | Buffer; uid?: number };
        const rawSource = m.source ?? m.body ?? null;

        let parsed: ParsedMail;
        if (rawSource) {
          try {
            parsed = await simpleParser(rawSource as any);
          } catch (err) {
            logger.error({ err, uid: m.uid }, 'Failed to parse message source');
            // Skip this message if parsing fails
            continue;
          }
        } else {
          // If no raw source is available, synthesize a minimal parsed object
          parsed = {
            subject: '',
            from: undefined,
            to: undefined,
            date: new Date(),
            text: '',
            html: '',
            attachments: [],
            headers: new Map(),
          } as ParsedMail;
        }

        // Check if this is a reply (has reply-to token)
        const replyToken = extractReplyToken(parsed as ParsedMail);

        // Helper to safely extract first address
        const getFirstAddress = (field?: { value?: Array<{ address?: string | null }> } | undefined): string => {
          if (!field || !Array.isArray(field.value) || field.value.length === 0) return '';
          return field.value[0]?.address ?? '';
        };

        const fromEmail = getFirstAddress(parsed.from as any);
        const toEmail = getFirstAddress(parsed.to as any);

  // Normalize received date
  const rawDate = parsed.date;
  const receivedAt = rawDate instanceof Date ? rawDate : rawDate ? new Date(String(rawDate)) : new Date();

        // Store in database
        await prisma.inboundMessage.create({
          data: {
            orgId,
            replyToToken: replyToken,
            fromEmail: fromEmail,
            toEmail: toEmail,
            subject: parsed.subject || '',
            bodyText: parsed.text || '',
            bodyHtml: parsed.html ? sanitizeEmailHtml(parsed.html) : null,
            rawSource: typeof rawSource === 'string' ? rawSource : (Buffer.isBuffer(rawSource) ? rawSource.toString('utf-8') : String(rawSource)),
            receivedAt,
          },
        });

        processedCount++;

        logger.info(
          {
            messageId: parsed.messageId,
            from: fromEmail,
            subject: parsed.subject,
          },
          'IMAP message processed'
        );
      } catch (error) {
        logger.error({ error, uid: (msg as any).uid }, 'Failed to process IMAP message');
      }
    }
    
    logger.info({ orgId, count: processedCount }, 'IMAP poll completed');
  } finally {
    await client.logout();
  }
  
  return processedCount;
}

/**
 * Extract reply token from message headers or body
 */
function extractReplyToken(parsed: ParsedMail): string | null {
  const headers = parsed.headers;

  // Prefer Map-like headers (mailparser) with `.get()`
  if (headers && typeof (headers as any).get === 'function') {
    const h = headers as Map<string, unknown>;
    const tokenHeader = h.get('x-reply-token');
    if (tokenHeader) return String(tokenHeader);

    const inReplyTo = h.get('in-reply-to');
    if (inReplyTo) {
      const match = String(inReplyTo).match(/<([a-f0-9]{64})@/);
      if (match) return match[1];
    }

    const references = h.get('references');
    if (references) {
      const match = String(references).match(/<([a-f0-9]{64})@/);
      if (match) return match[1];
    }
  }

  // Fallback: headers as plain object
  if (headers && typeof headers === 'object') {
    const h = headers as Record<string, unknown>;
    const token = h['x-reply-token'] || h['X-Reply-Token'];
    if (token) return String(token);

    const inReplyTo = h['in-reply-to'] || h['In-Reply-To'];
    if (inReplyTo) {
      const match = String(inReplyTo).match(/<([a-f0-9]{64})@/);
      if (match) return match[1];
    }

    const references = h['references'] || h['References'];
    if (references) {
      const match = String(references).match(/<([a-f0-9]{64})@/);
      if (match) return match[1];
    }
  }

  return null;
}

/**
 * Build message thread based on reply tokens
 */
export async function getMessageThread(messageId: string, orgId: string) {
  // Get original message
  const message = await prisma.message.findFirst({
    where: {
      id: messageId,
      orgId,
    },
  });
  
  if (!message) {
    return [];
  }
  
  // Get all replies
  const replies = await prisma.inboundMessage.findMany({
    where: {
      orgId,
      replyToToken: message.replyToToken,
    },
    orderBy: {
      receivedAt: 'asc',
    },
  });
  
  return {
    original: message,
    replies,
  };
}
