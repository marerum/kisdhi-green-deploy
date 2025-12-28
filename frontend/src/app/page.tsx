import { redirect } from 'next/navigation';

export default function Home() {
  // Redirect to projects page as the main entry point
  redirect('/projects');
}