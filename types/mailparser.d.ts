declare module 'mailparser' {
  import type { Readable } from 'stream';

  export function simpleParser(input: string | Buffer | Readable): Promise<ParsedMail>;

  export type Attachment = {
    filename?: string | null;
    contentType?: string | null;
    content?: Buffer | string | null;
  };

  export type AddressValue = {
    address?: string | null;
    name?: string | null;
  };

  export type AddressObject = {
    value?: AddressValue[];
    text?: string;
  };

  export type ParsedMail = {
    subject?: string | null;
    from?: AddressObject | undefined;
    to?: AddressObject | undefined;
    date?: Date | string | undefined;
    messageId?: string | undefined;
    text?: string | null;
    html?: string | null;
    attachments?: Attachment[];
    headers?: Map<string, string> | Record<string, string> | undefined;
    [key: string]: unknown;
  };
}
