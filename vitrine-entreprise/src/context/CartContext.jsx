import { createContext, useContext, useEffect, useState } from "react";
import { PRODUCTS, BOXES } from "@/data/content";

const CLE = "zayado_panier";
const CLE_FAV = "zayado_favoris";
const CATALOGUE = [...PRODUCTS, ...BOXES];
const CartContext = createContext(null);
const FavContext = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(CLE) || "[]");
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(CLE, JSON.stringify(items));
    } catch {
      /* stockage indisponible */
    }
  }, [items]);

  const ajouter = (id, qty = 1) =>
    setItems((prev) => {
      const ex = prev.find((i) => i.id === id);
      return ex
        ? prev.map((i) => (i.id === id ? { ...i, qty: Math.min(10, i.qty + qty) } : i))
        : [...prev, { id, qty }];
    });

  const retirer = (id) => setItems((prev) => prev.filter((i) => i.id !== id));
  const setQty = (id, qty) =>
    setItems((prev) =>
      qty <= 0
        ? prev.filter((i) => i.id !== id)
        : prev.map((i) => (i.id === id ? { ...i, qty: Math.min(10, qty) } : i))
    );
  const vider = () => setItems([]);

  const lignes = items
    .map((i) => ({ ...i, produit: CATALOGUE.find((p) => p.id === i.id) }))
    .filter((l) => l.produit);
  const count = lignes.reduce((s, l) => s + l.qty, 0);
  const total = lignes.reduce((s, l) => s + l.qty * l.produit.price, 0);

  return (
    <CartContext.Provider value={{ items, lignes, count, total, ajouter, retirer, setQty, vider }}>
      {children}
    </CartContext.Provider>
  );
}

export function FavProvider({ children }) {
  const [ids, setIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(CLE_FAV) || "[]");
    } catch {
      return [];
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(CLE_FAV, JSON.stringify(ids));
    } catch {
      /* stockage indisponible */
    }
  }, [ids]);
  const toggle = (id) => setIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const isFav = (id) => ids.includes(id);
  return <FavContext.Provider value={{ ids, toggle, isFav, count: ids.length }}>{children}</FavContext.Provider>;
}

export const useCart = () => useContext(CartContext);
export const useFav = () => useContext(FavContext);
export const catalogueComplet = CATALOGUE;
