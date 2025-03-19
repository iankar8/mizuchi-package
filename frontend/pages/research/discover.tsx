import React from 'react';
import MainLayout from '@/components/layouts/MainLayout';
import PublicNotesList from '@/components/research/PublicNotesList';
import { Separator } from '@/components/ui/separator';

const DiscoverPage: React.FC = () => {
  return (
    <MainLayout title="Discover Research Notes">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Research Note Discovery</h1>
          <p className="text-muted-foreground mt-2">
            Explore public research notes shared by the community. Discover insights, analysis, and market research from other users.
          </p>
          <Separator className="my-4" />
        </div>
        
        <PublicNotesList limit={12} />
      </div>
    </MainLayout>
  );
};

export default DiscoverPage;
