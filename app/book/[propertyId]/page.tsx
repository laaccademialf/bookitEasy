import BookClient from './BookClient';

export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const revalidate = 0;

interface BookingPageProps {
  params: {
    propertyId: string;
  };
}

export default function BookingPage({ params }: BookingPageProps) {
  return <BookClient propertyId={params.propertyId} />;
}
