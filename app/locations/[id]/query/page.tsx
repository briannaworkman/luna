import { redirect } from 'next/navigation'
import { getLocationById } from '@/components/globe/locations'
import { QueryPageClient } from './QueryPageClient'

export default function QueryPage({ params }: { params: { id: string } }) {
  const location = getLocationById(params.id)
  if (!location) redirect('/?hint=select-location')
  return <QueryPageClient location={location} />
}
