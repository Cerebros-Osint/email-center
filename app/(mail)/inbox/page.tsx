'use client';

import { useEffect, useState } from 'react';
import type { InboundMessage } from '@/types';
import { sanitizeEmailHtml } from '@/lib/sanitize';

export const dynamic = 'force-dynamic';

export default function InboxPage() {
  const [messages, setMessages] = useState<InboundMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<InboundMessage | null>(null);

  useEffect(() => {
    loadInbox();
  }, []);

  const loadInbox = async () => {
    try {
      const res = await fetch('/api/inbox?limit=50');
      const data = await res.json();
      setMessages(data.messages || []);
    } catch (error) {
      console.error('Failed to load inbox:', error);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  const loadMessageDetails = async (messageId: string) => {
    try {
      const res = await fetch(`/api/inbox/${messageId}`);
      const data = await res.json();
      setSelectedMessage(data);
    } catch (error) {
      console.error('Failed to load message details:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Inbox</h1>
          <p className="mt-2 text-gray-600">Messages entrants via IMAP</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Message List */}
          <div className="lg:col-span-1 bg-white rounded-lg shadow">
            <div className="p-4 border-b">
              <h2 className="font-semibold">Messages ({messages.length})</h2>
            </div>
            <div className="divide-y max-h-[600px] overflow-y-auto">
              {messages.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  Aucun message
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    onClick={() => loadMessageDetails(msg.id)}
                    className="p-4 hover:bg-gray-50 cursor-pointer"
                  >
                    <div className="font-medium text-sm truncate">{msg.fromEmail}</div>
                    <div className="text-sm text-gray-900 truncate">{msg.subject}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(msg.receivedAt).toLocaleString('fr-FR')}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Message Detail */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow">
            {selectedMessage ? (
              <div className="p-6">
                <div className="mb-4 pb-4 border-b">
                  <h2 className="text-xl font-semibold">{selectedMessage.subject}</h2>
                  <div className="mt-2 text-sm text-gray-600">
                    <div><span className="font-medium">De:</span> {selectedMessage.fromEmail}</div>
                    <div><span className="font-medium">À:</span> {selectedMessage.toEmail}</div>
                    <div><span className="font-medium">Date:</span> {new Date(selectedMessage.receivedAt).toLocaleString('fr-FR')}</div>
                    {selectedMessage.threadId && (
                      <div><span className="font-medium">Thread:</span> {selectedMessage.threadId}</div>
                    )}
                  </div>
                </div>

                <div className="prose max-w-none">
                  {selectedMessage.bodyHtml ? (
                    <div dangerouslySetInnerHTML={{ __html: sanitizeEmailHtml(selectedMessage.bodyHtml) }} />
                  ) : (
                    <pre className="whitespace-pre-wrap font-sans">{selectedMessage.bodyText}</pre>
                  )}
                </div>

                {selectedMessage.rawSource && (
                  <details className="mt-6">
                    <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-900">
                      Voir la source brute
                    </summary>
                    <pre className="mt-2 text-xs bg-gray-100 p-4 rounded overflow-auto max-h-96">
                      {selectedMessage.rawSource}
                    </pre>
                  </details>
                )}
              </div>
            ) : (
              <div className="p-6 text-center text-gray-500">
                Sélectionnez un message pour voir les détails
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
