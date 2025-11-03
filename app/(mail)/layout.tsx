'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function MailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Charger le nombre de notifications non lues
    loadUnreadCount();
  }, []);

  const loadUnreadCount = async () => {
    try {
      const res = await fetch('/api/notifications?limit=100');
      const data = await res.json();
      const notifications = Array.isArray(data) ? data : data.notifications || [];

      // Compter les notifications des dernières 24h
      const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
      type NotificationLike = { createdAt?: string | number };
      const recent = (notifications as NotificationLike[]).filter((n) => {
        const t = n?.createdAt ? new Date(n.createdAt).getTime() : 0;
        return t > oneDayAgo;
      });

      setUnreadCount(recent.length);
    } catch (error) {
      console.error('Failed to load unread count:', error);
    }
  };

  const navItems = [
    { href: '/dashboard', label: '📊 Dashboard', icon: 'dashboard' },
    { href: '/send', label: '✉️ Envoyer', icon: 'send' },
    { href: '/history', label: '📜 Historique', icon: 'history' },
    { href: '/inbox', label: '📥 Boîte de réception', icon: 'inbox' },
    { href: '/notifications', label: '📬 Notifications', icon: 'notifications', badge: unreadCount },
    { href: '/settings', label: '⚙️ Paramètres', icon: 'settings' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">
                Email Platform
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">admin@acme.com</span>
              <button
                onClick={() => {
                  document.cookie = 'session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
                  window.location.href = '/login';
                }}
                className="text-sm text-red-600 hover:text-red-700"
              >
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8 overflow-x-auto">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative flex items-center space-x-2 px-3 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    isActive
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                  }`}
                >
                  <span>{item.label}</span>
                  {item.badge && item.badge > 0 && (
                    <span className="flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main>{children}</main>
    </div>
  );
}
