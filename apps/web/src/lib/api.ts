export type Restaurant = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  logoUrl: string | null;
  watermark: string | null;
  primaryColor: string;
};

export type MenuItemSummary = {
  id: string;
  name: string;
  description: string | null;
  basePrice: number;
  imageUrl: string | null;
  has3d: boolean;
};

export type CategoryWithItems = {
  id: string;
  name: string;
  sortOrder: number;
  items: MenuItemSummary[];
};

export type MenuResponse = {
  id: string;
  slug: string;
  name: string;
  primaryColor: string;
  categories: CategoryWithItems[];
};

export type MeshAction = 'show' | 'hide';

export type ModifierOption = {
  id: string;
  name: string;
  priceDelta: number;
  meshNodeName: string | null;
  action: MeshAction;
  defaultOn: boolean;
};

export type ModifierGroup = {
  id: string;
  name: string;
  required: boolean;
  multiSelect: boolean;
  options: ModifierOption[];
};

export type MenuItemAsset = {
  glbUrl: string;
  usdzUrl: string | null;
  scaleFactor: number;
  lightingPreset: string;
};

export type MenuItemDetail = {
  id: string;
  name: string;
  description: string | null;
  basePrice: number;
  imageUrl: string | null;
  has3d: boolean;
  restaurant: {
    id: string;
    slug: string;
    name: string;
    watermark: string | null;
    primaryColor: string;
  };
  category: { id: string; name: string };
  asset: MenuItemAsset | null;
  modifiers: ModifierGroup[];
};

export type CartModifier = {
  optionId: string;
  name: string;
  priceDelta: number;
};

export type CartLine = {
  lineId: string;
  itemId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  imageUrl: string | null;
  modifiers: CartModifier[];
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    next: { revalidate: 30 },
  });
  if (!res.ok) {
    throw new Error(`API ${path} failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function getRestaurant(slug: string) {
  return apiFetch<Restaurant>(`/restaurants/${slug}`);
}

export function getMenu(slug: string) {
  return apiFetch<MenuResponse>(`/restaurants/${slug}/menu`);
}

export function getMenuItem(id: string) {
  return apiFetch<MenuItemDetail>(`/menu-items/${id}`);
}
