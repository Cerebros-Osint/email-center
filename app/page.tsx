import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function Home() {
  // Redirect to dashboard (or login if not authenticated)
  redirect('/dashboard');
}
