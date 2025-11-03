import { headers } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default function MailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Vérifier l'authentification côté serveur
  const headersList = headers();
  const cookieHeader = headersList.get('cookie');

  // Redirection si pas de session
  if (!cookieHeader || !cookieHeader.includes('session=')) {
    redirect('/login');
  }

  const navItems = [
    { href: '/dashboard', label: '📊 Dashboard', icon: 'dashboard' },
    { href: '/send', label: '✉️ Envoyer', icon: 'send' },
    { href: '/history', label: '📜 Historique', icon: 'history' },
    { href: '/inbox', label: '📥 Boîte de réception', icon: 'inbox' },
    { href: '/notifications', label: '📬 Notifications', icon: 'notifications' },
    { href: '/settings', label: '⚙️ Paramètres', icon: 'settings' },
  ];

  // Obtenir le pathname actuel côté serveur
  const pathname = headersList.get('x-pathname') || '/dashboard';

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
              <form action="/api/auth/logout" method="POST">
                <button
                  type="submit"
                  className="text-sm text-red-600 hover:text-red-700"
                >
                  Déconnexion
                </button>
              </form>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8 overflow-x-auto">
            {navItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
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
