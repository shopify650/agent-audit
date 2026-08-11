import SidebarLayout from '../../components/SidebarLayout';
import AuthGuard from '../../components/AuthGuard';
import ToastHost from '../../components/Toast';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <SidebarLayout>{children}</SidebarLayout>
      <ToastHost />
    </AuthGuard>
  );
}
