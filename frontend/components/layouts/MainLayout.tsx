import React, { ReactNode } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { cn } from '@/lib/utils';

interface MainLayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
  className?: string;
  hideNavigation?: boolean;
}

const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  title = 'Research Notebook',
  description = 'Organize and share your research notes',
  className,
  hideNavigation = false,
}) => {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background">
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className={cn("container mx-auto px-4 py-6", className)}>
        {children}
      </div>
    </div>
  );
};

export default MainLayout;
