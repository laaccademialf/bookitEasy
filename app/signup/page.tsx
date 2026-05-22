import { redirect } from 'next/navigation';

export default function SignupPage() {
  // Self-registration is disabled. Only existing accounts can sign in.
  redirect('/login');
}
