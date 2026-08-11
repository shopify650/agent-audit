import SidebarLayout from '../../components/SidebarLayout';
import AuthGuard from '../../components/AuthGuard';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <SidebarLayout>{children}</SidebarLayout>
    </AuthGuard>
  );
}
