import HostClient from './HostClient';

export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const revalidate = 0;

interface HostPageProps {
  params: {
    username: string;
  };
}

export default function HostPage({ params }: HostPageProps) {
  return <HostClient username={params.username} />;
}
