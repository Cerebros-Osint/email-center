'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface DashboardStats {
  messagesSent: number;
  messagesFailed: number;
  messagesQueued: number;
  killSwitch: boolean;
  activeSmtpAccounts: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      // Load org settings for kill switch
      const settingsRes = await fetch('/api/org/settings');
      const settings = await settingsRes.json();

      // Load SMTP accounts
      const smtpRes = await fetch('/api/smtp-accounts');
      const smtpData = await smtpRes.json();
      const smtpAccounts = Array.isArray(smtpData) ? smtpData : [];

      // Load recent history stats
      const historyRes = await fetch('/api/history?limit=100');
      const history = await historyRes.json();

      type RecipientLike = { sendStatus?: string };
      type MessageLike = { recipients?: RecipientLike[] | null };

      const messages = Array.isArray(history.messages) ? (history.messages as MessageLike[]) : [];
      const sent = messages.filter((m) =>
        Array.isArray(m.recipients) && m.recipients.some((r) => r.sendStatus === 'sent')
      ).length;
      const failed = messages.filter((m) =>
        Array.isArray(m.recipients) && m.recipients.some((r) => r.sendStatus === 'failed')
      ).length;
      const queued = messages.filter((m) =>
        Array.isArray(m.recipients) && m.recipients.some((r) => r.sendStatus === 'pending')
      ).length;

      setStats({
        messagesSent: sent,
        messagesFailed: failed,
        messagesQueued: queued,
        killSwitch: settings.killSwitch || false,
        activeSmtpAccounts: smtpAccounts.length,
      });
    } catch (error) {
      console.error('Failed to load stats:', error);
      setStats({
        messagesSent: 0,
        messagesFailed: 0,
        messagesQueued: 0,
        killSwitch: false,
        activeSmtpAccounts: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleKillSwitch = async () => {
    try {
      const newValue = !stats?.killSwitch;
      await fetch('/api/org/kill-switch/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: newValue }),
      });
      loadStats();
    } catch (error) {
      console.error('Failed to toggle kill switch:', error);
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
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-gray-600">Vue d&apos;ensemble de votre plateforme email</p>
        </div>

        {/* Kill Switch Alert */}
        {stats?.killSwitch && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-red-600 font-semibold">⚠️ Kill Switch activé</span>
                <span className="ml-3 text-red-600">Tous les envois sont suspendus</span>
              </div>
              <button
                onClick={toggleKillSwitch}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Désactiver
              </button>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-600">Messages envoyés</div>
            <div className="mt-2 text-3xl font-bold text-green-600">{stats?.messagesSent || 0}</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-600">Messages échoués</div>
            <div className="mt-2 text-3xl font-bold text-red-600">{stats?.messagesFailed || 0}</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-600">En attente</div>
            <div className="mt-2 text-3xl font-bold text-blue-600">{stats?.messagesQueued || 0}</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-600">Comptes SMTP actifs</div>
            <div className="mt-2 text-3xl font-bold text-gray-900">{stats?.activeSmtpAccounts || 0}</div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Actions rapides</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/send"
              className="flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              📧 Envoyer un email
            </Link>
            <Link
              href="/inbox"
              className="flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              📥 Inbox
            </Link>
            <Link
              href="/history"
              className="flex items-center justify-center px-4 py-3 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              📊 Historique
            </Link>
          </div>
        </div>

        {/* Navigation */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Navigation</h2>
          <div className="space-y-2">
            <Link href="/settings" className="block text-blue-600 hover:text-blue-800">
              ⚙️ Paramètres
            </Link>
            <Link href="/settings#smtp" className="block text-blue-600 hover:text-blue-800">
              🔧 Comptes SMTP
            </Link>
            <Link href="/settings#identities" className="block text-blue-600 hover:text-blue-800">
              👤 Identités
            </Link>
            <Link href="/settings#dns" className="block text-blue-600 hover:text-blue-800">
              🌐 DNS & DMARC
            </Link>
            <a href="/api/metrics" target="_blank" className="block text-blue-600 hover:text-blue-800">
              📈 Métriques Prometheus
            </a>
          </div>
        </div>

        {/* Kill Switch Control */}
        {!stats?.killSwitch && (
          <div className="mt-6 bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Contrôles d&apos;urgence</h2>
            <button
              onClick={toggleKillSwitch}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              🛑 Activer Kill Switch
            </button>
            <p className="mt-2 text-sm text-gray-600">
              Le kill switch suspend immédiatement tous les envois en cours
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
