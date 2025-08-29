import Nav from '@/components/Nav';

export default function ProviderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Nav type="provider" />
      <main className="py-6">
        {children}
      </main>
    </div>
  );
}
