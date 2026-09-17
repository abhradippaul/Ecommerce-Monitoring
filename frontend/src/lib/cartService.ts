import { authenticatedFetch } from "./api";

export function getCartServiceBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_ORDER_SERVICE;
  if (envUrl) {
    const formatted = envUrl.startsWith("http") ? envUrl : `http://${envUrl}`;
    return `${formatted}/api/v1/orders/cart`;
  }

  if (typeof window !== "undefined") {
    const isGateway = window.location.port === "" || window.location.port === "80";
    if (isGateway) {
      return "/api/v1/orders/cart";
    }
  }

  return "http://localhost:3003/api/v1/orders/cart";
}

export interface BackendCartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  category?: string;
  images?: string[];
}

export interface BackendCart {
  userId: string;
  items: BackendCartItem[];
  totalPrice: number;
  totalQuantity: number;
}

export async function fetchCartCount(): Promise<number> {
  try {
    const baseUrl = getCartServiceBaseUrl();
    const res = await authenticatedFetch(`${baseUrl}/count`);
    if (!res.ok) return 0;
    const data = await res.json();
    return data.data?.count ?? data.data?.totalQuantity ?? 0;
  } catch (error) {
    console.error("Failed to fetch cart count:", error);
    return 0;
  }
}

export async function fetchCartDetails(): Promise<BackendCart | null> {
  try {
    const baseUrl = getCartServiceBaseUrl();
    const res = await authenticatedFetch(`${baseUrl}/details`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.data;
  } catch (error) {
    console.error("Failed to fetch cart details:", error);
    return null;
  }
}

export async function fetchUserCart(): Promise<BackendCart | null> {
  return fetchCartDetails();
}

export async function addItemToCart(item: BackendCartItem): Promise<BackendCart | null> {
  try {
    const baseUrl = getCartServiceBaseUrl();
    const res = await authenticatedFetch(`${baseUrl}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.data;
  } catch (error) {
    console.error("Failed to add item to cart:", error);
    return null;
  }
}

export async function updateItemQuantityInCart(
  productId: string,
  quantity: number
): Promise<BackendCart | null> {
  try {
    const baseUrl = getCartServiceBaseUrl();
    const res = await authenticatedFetch(`${baseUrl}/items/${productId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.data;
  } catch (error) {
    console.error("Failed to update cart item:", error);
    return null;
  }
}

export async function removeItemFromCart(productId: string): Promise<BackendCart | null> {
  try {
    const baseUrl = getCartServiceBaseUrl();
    const res = await authenticatedFetch(`${baseUrl}/items/${productId}`, {
      method: "DELETE",
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.data;
  } catch (error) {
    console.error("Failed to remove cart item:", error);
    return null;
  }
}

export async function clearUserCart(): Promise<BackendCart | null> {
  try {
    const baseUrl = getCartServiceBaseUrl();
    const res = await authenticatedFetch(baseUrl, {
      method: "DELETE",
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.data;
  } catch (error) {
    console.error("Failed to clear cart:", error);
    return null;
  }
}
