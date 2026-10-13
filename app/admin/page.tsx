import { headers } from 'next/headers';
import { redirect,notFound } from 'next/navigation';
import { getAuth } from '@/lib/accounts/auth';
import { isAdmin } from '@/lib/accounts/http';
import { adminOverview } from '@/lib/accounts/admin';
import AdminDashboard from '@/components/AdminDashboard';
export const dynamic='force-dynamic';
export default async function AdminPage(){
  const session=await getAuth().api.getSession({headers:await headers()});
  if(!session)redirect('/');
  if(!isAdmin(session.user.id))notFound();
  return <AdminDashboard initial={await adminOverview()}/>;
}
