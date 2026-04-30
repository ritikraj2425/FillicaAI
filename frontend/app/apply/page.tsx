'use client';

import ApplyPageContent from '@/components/ApplyPageContent';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function ApplyQueryPage() {
  const searchParams = useSearchParams();
  return <ApplyPageContent jobId={searchParams.get('id')} />;
}

export default function ApplyPage() {
  return (
    <Suspense fallback={<div>Loading application engine...</div>}>
      <ApplyQueryPage />
    </Suspense>
  );
}
