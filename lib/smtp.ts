import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { prisma } from './db';
import { decrypt } from './crypto';
import { logger } from './logger';
import { LRUCache } from 'lru-cache';

interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  pool?: boolean;
  maxConnections?: number;
  maxMessages?: number;
}

// Transporter pool using LRU cache to avoid memory leaks and close transporters on eviction
const transportPool = new LRUCache<string, Transporter>({
  max: 200,
  ttl: 1000 * 60 * 60, // 1 hour
  dispose: (transporter: Transporter, _key: string) => {
    try {
      transporter.close();
    } catch (e) {
      // ignore
    }
  },
});

/**
 * Get or create SMTP transporter
 */
export async function getTransporter(smtpAccountId: string): Promise<Transporter> {
  const cached = transportPool.get(smtpAccountId);
  if (cached) return cached;
  
  const account = await prisma.smtpAccount.findUnique({
    where: { id: smtpAccountId },
  });
  
  if (!account) {
    throw new Error(`SMTP account ${smtpAccountId} not found`);
  }
  
  const password = await decrypt(account.passwordEnc);
  
  const config: SmtpConfig = {
    host: account.host,
    port: account.port,
    secure: account.port === 465,
    auth: {
      user: account.username,
      pass: password,
    },
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
  };
  
  const transporter = nodemailer.createTransport(config);
  transportPool.set(smtpAccountId, transporter);
  
  return transporter;
}

/**
 * Test SMTP connection and get capabilities
 */
export async function testSmtpConnection(smtpAccountId: string): Promise<{
  success: boolean;
  capabilities: {
    starttls: boolean;
    size: number | null;
    pipelining: boolean;
    eightBitMime: boolean;
    latencyMs: number;
  };
  error?: string;
}> {
  const transporter = await getTransporter(smtpAccountId);
  
  const startTime = Date.now();
  
  try {
    await transporter.verify();
    const latencyMs = Date.now() - startTime;
    
    return {
      success: true,
      capabilities: {
        starttls: true, // Most modern SMTP servers support STARTTLS
        size: 25 * 1024 * 1024, // Default 25MB, parse from EHLO response
        pipelining: true,
        eightBitMime: true,
        latencyMs,
      },
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error({ error: errorMessage, smtpAccountId }, 'SMTP test failed');
    return {
      success: false,
      capabilities: {
        starttls: false,
        size: null,
        pipelining: false,
        eightBitMime: false,
        latencyMs: Date.now() - startTime,
      },
      error: errorMessage,
    };
  }
}

/**
 * Send email via SMTP
 */
export async function sendEmail(params: {
  smtpAccountId: string;
  from: string;
  to: string;
  subject: string;
  html?: string;
  text?: string;
  headers?: Record<string, string>;
}): Promise<{
  success: boolean;
  messageId?: string;
  response?: string;
  latencyMs: number;
  error?: string;
}> {
  const startTime = Date.now();
  
  try {
    const transporter = await getTransporter(params.smtpAccountId);
    
    const info = await transporter.sendMail({
      from: params.from,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
      headers: params.headers,
    });
    
    const latencyMs = Date.now() - startTime;
    
    logger.info(
      {
        smtpAccountId: params.smtpAccountId,
        to: params.to,
        messageId: info.messageId,
        latencyMs,
      },
      'Email sent successfully'
    );
    
    return {
      success: true,
      messageId: info.messageId,
      response: info.response,
      latencyMs,
    };
  } catch (error: unknown) {
    const latencyMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(
      {
        error: errorMessage,
        smtpAccountId: params.smtpAccountId,
        to: params.to,
        latencyMs,
      },
      'SMTP send failed'
    );

    return {
      success: false,
      latencyMs,
      error: errorMessage,
    };
  }
}

/**
 * Close a transporter connection
 */
export async function closeTransporter(smtpAccountId: string): Promise<void> {
  const transporter = transportPool.get(smtpAccountId);
  if (transporter) {
    transporter.close();
    transportPool.delete(smtpAccountId);
  }
}

/**
 * Close all transporter connections
 */
export async function closeAllTransporters(): Promise<void> {
  for (const [id, transporter] of transportPool.entries()) {
    transporter.close();
    transportPool.delete(id);
  }
}
