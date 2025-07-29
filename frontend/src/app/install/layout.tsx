import { PolarisProvider } from '@/components/providers/PolarisProvider';

export default function InstallLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PolarisProvider>
      {children}
    </PolarisProvider>
  );
}