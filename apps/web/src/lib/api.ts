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

export type NutritionTag = {
  id: string;
  label: string;
  position: string;
  normal: string;
};

export type MenuItemDetail = {
  id: string;
  name: string;
  description: string | null;
  basePrice: number;
  imageUrl: string | null;
  has3d: boolean;
  nutritionTags: NutritionTag[];
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
  itemId: string | null;
  guestId: string;
  guestName: string;
  name: string;
  unitPrice: number;
  quantity: number;
  imageUrl: string | null;
  modifiers: CartModifier[];
};

export type TableSession = {
  id: string;
  tableNumber: string;
  status: 'open' | 'ordered' | 'closed';
  splitMode: 'none' | 'by_person' | 'by_item';
  guestCount: number;
  restaurant: {
    id: string;
    slug: string;
    name: string;
    watermark: string | null;
    primaryColor: string;
  };
  lines: CartLine[];
  total: number;
  orders: { id: string; status: string; createdAt: string }[];
  payments: {
    id: string;
    method: string;
    status: string;
    amount: number;
    guestId: string | null;
    meta: Record<string, unknown> | null;
  }[];
  updatedAt: string;
  lastPaymentId?: string;
};

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${path} failed: ${res.status} ${text}`);
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

export function getOrCreateTableSession(slug: string, tableNumber: string) {
  return apiFetch<TableSession>(`/tables/${slug}/${tableNumber}/session`);
}

export function getTableSession(sessionId: string) {
  return apiFetch<TableSession>(`/tables/sessions/${sessionId}`);
}

export function addTableLine(
  sessionId: string,
  body: {
    guestId: string;
    guestName?: string;
    menuItemId?: string;
    name: string;
    unitPrice: number;
    quantity?: number;
    imageUrl?: string | null;
    modifiers?: CartModifier[];
  },
) {
  return apiFetch<TableSession>(`/tables/sessions/${sessionId}/lines`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function updateTableLine(
  sessionId: string,
  lineId: string,
  body: { quantity: number; guestId: string },
) {
  return apiFetch<TableSession>(
    `/tables/sessions/${sessionId}/lines/${lineId}`,
    { method: 'PATCH', body: JSON.stringify(body) },
  );
}

export function removeTableLine(
  sessionId: string,
  lineId: string,
  guestId: string,
) {
  return apiFetch<TableSession>(
    `/tables/sessions/${sessionId}/lines/${lineId}?guestId=${encodeURIComponent(guestId)}`,
    { method: 'DELETE' },
  );
}

export function sendOrderToKitchen(sessionId: string, note?: string) {
  return apiFetch<TableSession>(`/tables/sessions/${sessionId}/order`, {
    method: 'POST',
    body: JSON.stringify({ note }),
  });
}

export function setTableSplit(
  sessionId: string,
  body: { splitMode: 'none' | 'by_person' | 'by_item'; guestCount?: number },
) {
  return apiFetch<TableSession>(`/tables/sessions/${sessionId}/split`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function createPayment(
  sessionId: string,
  body: {
    method: 'pix' | 'apple_pay' | 'google_pay' | 'card';
    amount: number;
    guestId?: string;
  },
) {
  return apiFetch<TableSession>(`/tables/sessions/${sessionId}/pay`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function confirmPayment(paymentId: string) {
  return apiFetch<TableSession>(`/tables/payments/${paymentId}/confirm`, {
    method: 'POST',
    body: '{}',
  });
}
