'use client';

import { useEffect, useState } from 'react';

export const dynamic = 'force-dynamic';

type AttemptLike = {
  id: string;
  createdAt: string | number;
  result?: string;
  smtpAccountId?: string;
  latencyMs?: number | null;
  responseRaw?: string | null;
};

export default function HistoryClient() {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecipient, setSelectedRecipient] = useState<any | null>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const res = await fetch('/api/history?limit=50');
      const data = await res.json();
      setMessages(data.messages || []);
    } catch (error) {
      console.error('Failed to load history:', error);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  const loadRecipientDetails = async (recipientId: string) => {
    try {
      const res = await fetch(`/api/history/${recipientId}/attempts`);
      const data = await res.json();
      setSelectedRecipient(data);
    } catch (error) {
      console.error('Failed to load recipient details:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-blue-100 text-blue-800';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
          <h1 className="text-3xl font-bold text-gray-900">Historique des envois</h1>
          <p className="mt-2 text-gray-600">Suivi détaillé de tous vos messages</p>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sujet</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">De</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Destinataires</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {messages.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    Aucun message
                  </td>
                </tr>
              ) : (
                messages.map((msg) => (
                  <tr key={msg.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(msg.createdAt).toLocaleString('fr-FR')}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{msg.subject}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {msg.identity?.displayName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {msg.recipients?.length ?? 0}
                    </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex flex-col gap-1">
                              {(msg.recipients ?? []).map((r: any) => (
                                <span
                                  key={r.id}
                                  className={`inline-flex text-xs px-2 py-1 rounded-full ${getStatusColor(r.sendStatus)}`}
                                >
                                  {r.toEmail}: {r.sendStatus}
                                </span>
                              ))}
                            </div>
                          </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {(msg.recipients ?? []).map((r: any) => (
                        <button
                          key={r.id}
                          onClick={() => loadRecipientDetails(r.id)}
                          className="text-blue-600 hover:text-blue-800 underline block"
                        >
                          Détails
                        </button>
                      ))}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Recipient Details Modal */}
        {selectedRecipient && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-semibold">Détails de l&apos;envoi</h3>
                  <button
                    onClick={() => setSelectedRecipient(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <span className="font-medium">Destinataire:</span> {selectedRecipient.toEmail}
                  </div>
                  <div>
                    <span className="font-medium">Statut:</span>{' '}
                    <span className={`px-2 py-1 rounded text-sm ${getStatusColor(selectedRecipient.sendStatus)}`}>
                      {selectedRecipient.sendStatus}
                    </span>
                  </div>
                  {selectedRecipient.mxDomain && (
                    <div>
                      <span className="font-medium">MX Détecté:</span> {selectedRecipient.mxDomain}
                    </div>
                  )}
                  {selectedRecipient.routeSmtpAccountId && (
                    <div>
                      <span className="font-medium">SMTP Utilisé (ID):</span> {selectedRecipient.routeSmtpAccountId}
                    </div>
                  )}

                  <div className="mt-6">
                    <h4 className="font-medium mb-2">Tentatives d&apos;envoi</h4>
                    <div className="space-y-2">
                      {selectedRecipient.sendAttempts?.length === 0 ? (
                        <p className="text-gray-500">Aucune tentative</p>
                      ) : (

                        (selectedRecipient.sendAttempts ?? []).map((attempt: AttemptLike) => (
                          <div key={attempt.id} className="border rounded p-3 bg-gray-50">
                            <div className="flex justify-between text-sm">
                              <span>{new Date(attempt.createdAt).toLocaleString('fr-FR')}</span>
                              <span
                                className={`font-medium ${
                                  attempt.result === 'ok' ? 'text-green-600' : 'text-red-600'
                                }`}
                              >
                                {attempt.result}
                              </span>
                            </div>
                            <div className="text-sm mt-2">
                              <div>
                                <span className="font-medium">SMTP (ID):</span> {attempt.smtpAccountId}
                              </div>
                              {attempt.latencyMs && (
                                <div>
                                  <span className="font-medium">Latence:</span> {attempt.latencyMs}ms
                                </div>
                              )}
                              {attempt.responseRaw && (
                                <div className="mt-2">
                                  <span className="font-medium">Réponse:</span>
                                  <pre className="mt-1 text-xs bg-gray-100 p-2 rounded overflow-auto">
                                    {attempt.responseRaw}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
