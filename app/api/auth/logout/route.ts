import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function POST() {
  try {
    // Supprimer le cookie de session
    const cookieStore = cookies();
    cookieStore.delete('session');

    // Rediriger vers la page de login
    redirect('/login');
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ error: 'Erreur lors de la déconnexion' }, { status: 500 });
  }
}
