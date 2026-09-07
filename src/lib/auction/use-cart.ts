"use client";

import { useSyncExternalStore } from "react";
import {
  getCart,
  getCartServerSnapshot,
  subscribeCart,
  updateCart,
  type CartItem,
} from "./selection-cart";

/** 어느 화면에서든 같은 취합 바구니를 읽고 쓴다. */
export function useCart(): {
  cart: CartItem[];
  setCart: (next: CartItem[] | ((prev: CartItem[]) => CartItem[])) => void;
} {
  const cart = useSyncExternalStore(subscribeCart, getCart, getCartServerSnapshot);
  return { cart, setCart: updateCart };
}
