import { redirect } from 'next/navigation';

// Legacy /cases page - redirect to /incidents
export default function CasesPage() {
  redirect('/incidents');
}
