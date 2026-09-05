import { notFound } from 'next/navigation';
import { getMenuItem } from '@/lib/api';
import { ItemDetailView } from '@/components/ItemDetailView';

type Props = {
  params: Promise<{ slug: string; itemId: string }>;
  searchParams: Promise<{ mesa?: string }>;
};

export default async function ItemPage({ params, searchParams }: Props) {
  const { slug, itemId } = await params;
  const { mesa } = await searchParams;
  const tableId = mesa ?? '0';

  let item;
  try {
    item = await getMenuItem(itemId);
  } catch {
    notFound();
  }

  if (item.restaurant.slug !== slug) {
    notFound();
  }

  return <ItemDetailView item={item} tableId={tableId} />;
}
