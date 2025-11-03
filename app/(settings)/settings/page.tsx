'use client';

import { useEffect, useState } from 'react';
import type { SmtpAccount, Identity, OrgSettings } from '@/types';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('smtp');
  const [smtpAccounts, setSmtpAccounts] = useState<SmtpAccount[]>([]);
  const [identities, setIdentities] = useState<Identity[]>([]);
  const [settings, setSettings] = useState<OrgSettings | null>(null);
  const [showAddSmtp, setShowAddSmtp] = useState(false);
  const [showAddIdentity, setShowAddIdentity] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [smtpRes, identitiesRes, settingsRes] = await Promise.all([
        fetch('/api/smtp-accounts'),
        fetch('/api/identities'),
        fetch('/api/org/settings'),
      ]);

      const smtpData = await smtpRes.json();
      const identitiesData = await identitiesRes.json();
      const settingsData = await settingsRes.json();

      setSmtpAccounts(Array.isArray(smtpData) ? smtpData : []);
      setIdentities(Array.isArray(identitiesData) ? identitiesData : []);
      setSettings(settingsData);
    } catch (error) {
      console.error('Failed to load settings:', error);
      setSmtpAccounts([]);
      setIdentities([]);
    }
  };

  const handleAddSmtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    try {
      const res = await fetch('/api/smtp-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: formData.get('provider'),
          host: formData.get('host'),
          port: Number(formData.get('port')),
          username: formData.get('username'),
          password: formData.get('password'),
          fromEmail: formData.get('fromEmail'),
          rateLimitPerMin: Number(formData.get('rateLimitPerMin')) || 100,
        }),
      });

      if (res.ok) {
        alert('✅ Compte SMTP ajouté');
        setShowAddSmtp(false);
        loadData();
        form.reset();
      } else {
        const data = await res.json();
        alert('❌ ' + (data.error?.message || 'Erreur'));
      }
    } catch (error) {
      alert('❌ Erreur réseau');
    }
  };

  const handleTestSmtp = async (accountId: string) => {
    try {
      const res = await fetch(`/api/smtp-accounts/${accountId}/test`, {
        method: 'POST',
      });
      const data = await res.json();

      if (data.success) {
        alert(`✅ Connexion réussie!\n\nCapabilities:\n- STARTTLS: ${data.capabilities.starttls}\n- SIZE: ${data.capabilities.size}\n- PIPELINING: ${data.capabilities.pipelining}\n- 8BITMIME: ${data.capabilities.eightBitMime}\n- Latence: ${data.capabilities.latencyMs}ms`);
      } else {
        alert('❌ ' + data.error);
      }
    } catch (error) {
      alert('❌ Erreur réseau');
    }
  };

  const handleAddIdentity = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    try {
      const res = await fetch('/api/identities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: formData.get('displayName'),
          fromEmail: formData.get('fromEmail'),
          defaultSmtpAccountId: formData.get('defaultSmtpAccountId'),
        }),
      });

      if (res.ok) {
        alert('✅ Identité ajoutée');
        setShowAddIdentity(false);
        loadData();
        form.reset();
      } else {
        const data = await res.json();
        alert('❌ ' + (data.error?.message || 'Erreur'));
      }
    } catch (error) {
      alert('❌ Erreur réseau');
    }
  };

  const handleDeleteSmtp = async (accountId: string) => {
    if (!confirm('Supprimer ce compte SMTP ?')) return;

    try {
      const res = await fetch(`/api/smtp-accounts/${accountId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        alert('✅ Compte supprimé');
        loadData();
      } else {
        alert('❌ Erreur');
      }
    } catch (error) {
      alert('❌ Erreur réseau');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Paramètres</h1>
      <p className="mt-2 text-gray-600">Configuration de votre plateforme email</p>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('smtp')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'smtp'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Comptes SMTP
              </button>
              <button
                onClick={() => setActiveTab('identities')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'identities'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Identités
              </button>
              <button
                onClick={() => setActiveTab('general')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'general'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Général
              </button>
            </nav>
          </div>
        </div>

        {/* SMTP Accounts Tab */}
        {activeTab === 'smtp' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Comptes SMTP</h2>
              <button
                onClick={() => setShowAddSmtp(!showAddSmtp)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                + Ajouter un compte
              </button>
            </div>

            {showAddSmtp && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">Nouveau compte SMTP</h3>
                <form onSubmit={handleAddSmtp} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Provider</label>
                      <input
                        type="text"
                        name="provider"
                        required
                        placeholder="AWS SES, Titan, etc."
                        className="w-full px-3 py-2 border rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Host</label>
                      <input
                        type="text"
                        name="host"
                        required
                        placeholder="smtp.example.com"
                        className="w-full px-3 py-2 border rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Port</label>
                      <input
                        type="number"
                        name="port"
                        required
                        defaultValue={587}
                        className="w-full px-3 py-2 border rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Username</label>
                      <input
                        type="text"
                        name="username"
                        required
                        className="w-full px-3 py-2 border rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Password</label>
                      <input
                        type="password"
                        name="password"
                        required
                        className="w-full px-3 py-2 border rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">From Email</label>
                      <input
                        type="email"
                        name="fromEmail"
                        required
                        className="w-full px-3 py-2 border rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Rate Limit (per min)</label>
                      <input
                        type="number"
                        name="rateLimitPerMin"
                        defaultValue={100}
                        className="w-full px-3 py-2 border rounded-md"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Créer
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddSmtp(false)}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                    >
                      Annuler
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Provider</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Host</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {smtpAccounts.map((account) => (
                    <tr key={account.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{account.provider}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{account.host}:{account.port}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{account.fromEmail}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          account.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {account.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                        <button
                          onClick={() => handleTestSmtp(account.id)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          Tester
                        </button>
                        <button
                          onClick={() => handleDeleteSmtp(account.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Supprimer
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Identities Tab */}
        {activeTab === 'identities' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Identités d&apos;envoi</h2>
              <button
                onClick={() => setShowAddIdentity(!showAddIdentity)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                + Ajouter une identité
              </button>
            </div>

            {showAddIdentity && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">Nouvelle identité</h3>
                <form onSubmit={handleAddIdentity} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Nom d&apos;affichage</label>
                    <input
                      type="text"
                      name="displayName"
                      required
                      placeholder="Support Acme"
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Email</label>
                    <input
                      type="email"
                      name="fromEmail"
                      required
                      placeholder="support@acme.com"
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Compte SMTP par défaut</label>
                    <select
                      name="defaultSmtpAccountId"
                      required
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      <option value="">Sélectionner...</option>
                      {smtpAccounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.provider} - {account.fromEmail}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Créer
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddIdentity(false)}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                    >
                      Annuler
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {identities.map((identity) => (
                <div key={identity.id} className="bg-white rounded-lg shadow p-6">
                  <h3 className="font-semibold text-lg">{identity.displayName}</h3>
                  <p className="text-sm text-gray-600 mt-1">{identity.fromEmail}</p>
                  {identity.defaultSmtpAccount && (
                    <p className="text-xs text-gray-500 mt-2">
                      SMTP: {identity.defaultSmtpAccount.provider}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* General Tab */}
        {activeTab === 'general' && settings && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Paramètres généraux</h2>
              <div className="space-y-4">
                <div>
                  <span className="font-medium">Kill Switch:</span>{' '}
                  <span className={settings.killSwitch ? 'text-red-600' : 'text-green-600'}>
                    {settings.killSwitch ? 'ACTIVÉ' : 'Désactivé'}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Rate Limit:</span> {settings.rateLimitPerMin || 300}/min
                </div>
                <div>
                  <span className="font-medium">Rate Limit journalier:</span> {settings.rateLimitPerDay || 10000}/jour
                </div>
                <div>
                  <span className="font-medium">Rétention source brute:</span> {settings.retentionDaysRawSource || 60} jours
                </div>
                <div>
                  <span className="font-medium">List-Unsubscribe:</span>{' '}
                  {settings.listUnsubscribeEnabled ? 'Activé' : 'Désactivé'}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Liens rapides</h2>
              <div className="space-y-2">
                <a href="/api/metrics" target="_blank" className="block text-blue-600 hover:text-blue-800">
                  📊 Métriques Prometheus
                </a>
                <a href="/api/health" target="_blank" className="block text-blue-600 hover:text-blue-800">
                  ❤️ Health Check
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
