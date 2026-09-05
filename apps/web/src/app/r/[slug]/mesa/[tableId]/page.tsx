import { notFound } from 'next/navigation';
import { getMenu } from '@/lib/api';
import { MenuView } from '@/components/MenuView';

type Props = {
  params: Promise<{ slug: string; tableId: string }>;
};

export default async function TableMenuPage({ params }: Props) {
  const { slug, tableId } = await params;

  let menu;
  try {
    menu = await getMenu(slug);
  } catch {
    notFound();
  }

  return <MenuView menu={menu} tableId={tableId} />;
}
