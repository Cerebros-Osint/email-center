'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Identity } from '@/types';

export default function SendPage() {
  const router = useRouter();
  const [identities, setIdentities] = useState<Identity[]>([]);
  const [selectedIdentity, setSelectedIdentity] = useState('');
  const [recipients, setRecipients] = useState('');
  const [subject, setSubject] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [loading, setLoading] = useState(false);
  const [preflightResult, setPreflightResult] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    loadIdentities();
  }, []);

  const loadIdentities = async () => {
    try {
      const res = await fetch('/api/identities');
      const data = await res.json();
      // Vérifier que data est bien un tableau
      let identitiesArray = [];
      if (Array.isArray(data)) {
        identitiesArray = data;
      } else if (data.identities && Array.isArray(data.identities)) {
        identitiesArray = data.identities;
      } else {
        console.error('Invalid identities format:', data);
      }
      
      setIdentities(identitiesArray);
      if (identitiesArray.length > 0) {
        setSelectedIdentity(identitiesArray[0].id);
      }
    } catch (error) {
      console.error('Failed to load identities:', error);
      setIdentities([]);
    }
  };

  const handlePreflight = async () => {
    setError('');
    setPreflightResult(null);

    const recipientList = recipients.split(',').map(e => e.trim()).filter(Boolean);

    if (!selectedIdentity) {
      setError('Sélectionnez une identité');
      return;
    }

    if (recipientList.length === 0) {
      setError('Ajoutez au moins un destinataire');
      return;
    }

    if (!subject) {
      setError('Le sujet est requis');
      return;
    }

    try {
      const res = await fetch('/api/messages/preflight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identityId: selectedIdentity,
          recipients: recipientList,
          subject,
          bodyHtml: bodyHtml || `<p>${subject}</p>`,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error?.message || 'Erreur preflight');
        return;
      }

      setPreflightResult(data);
    } catch (error) {
      setError('Erreur réseau');
    }
  };

  const handleSend = async () => {
    setLoading(true);
    setError('');

    try {
      const recipientList = recipients.split(',').map(e => e.trim()).filter(Boolean);

      // Create message
      const msgRes = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identityId: selectedIdentity,
          recipients: recipientList,
          subject,
          bodyHtml: bodyHtml || `<p>${subject}</p>`,
          bodyText: subject,
        }),
      });

      const msgData = await msgRes.json();
      if (!msgRes.ok) {
        setError(msgData.error?.message || 'Erreur création message');
        return;
      }

      // Send message
      const sendRes = await fetch(`/api/messages/${msgData.message.id}/send`, {
        method: 'POST',
      });

      const sendData = await sendRes.json();
      if (!sendRes.ok) {
        setError(sendData.error?.message || 'Erreur envoi');
        return;
      }

      alert(`✅ ${sendData.queued} message(s) en file d'attente`);
      router.push('/history');
    } catch (error) {
      setError('Erreur réseau');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Envoyer un email</h1>
          <p className="mt-2 text-gray-600">Composer et envoyer des emails professionnels</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded p-4">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {/* Identity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Identité d&apos;envoi
            </label>
            <select
              value={selectedIdentity}
              onChange={(e) => setSelectedIdentity(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              {identities.map((id) => (
                <option key={id.id} value={id.id}>
                  {id.displayName} &lt;{id.fromEmail}&gt;
                </option>
              ))}
            </select>
          </div>

          {/* Recipients */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Destinataires (séparés par des virgules)
            </label>
            <input
              type="text"
              value={recipients}
              onChange={(e) => setRecipients(e.target.value)}
              placeholder="user@example.com, other@example.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sujet
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Sujet de l&apos;email"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Body */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Message
            </label>
            <textarea
              value={bodyHtml}
              onChange={(e) => setBodyHtml(e.target.value)}
              placeholder="Contenu de l&apos;email (HTML supporté)"
              rows={10}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <button
              onClick={handlePreflight}
              className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              🔍 Preflight Check
            </button>
            <button
              onClick={handleSend}
              disabled={loading || !preflightResult?.canSend}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Envoi...' : '📧 Envoyer'}
            </button>
          </div>

          {/* Preflight Result */}
          {preflightResult && (
            <div className="mt-6 border-t pt-6">
              <h3 className="text-lg font-semibold mb-4">Résultat Preflight</h3>
              <div className={`p-4 rounded ${preflightResult.canSend ? 'bg-green-50' : 'bg-red-50'}`}>
                <p className="font-medium">
                  {preflightResult.canSend ? '✅ Prêt à envoyer' : '❌ Problèmes détectés'}
                </p>
                {preflightResult.recommendation && (
                  <div className="mt-4 space-y-2">
                    <p className="text-sm font-medium">SMTP recommandé:</p>
                    <p className="text-sm">{preflightResult.recommendation.smtpProvider}</p>
                    <p className="text-xs text-gray-600">Score: {preflightResult.recommendation.score}/100</p>
                    {preflightResult.recommendation.explanation && (
                      <p className="text-sm mt-2">{preflightResult.recommendation.explanation}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
