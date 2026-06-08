// src/context/CartContext.js
'use client';

import { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext();

export function CartProvider({ children }) {
  const [cart, setCart] = useState([]);

  // Adicionar item à sacola
  const addToCart = (produto) => {
    setCart((prevCart) => {
      const itemExistente = prevCart.find((item) => item.id === produto.id);

      if (itemExistente) {
        return prevCart.map((item) =>
          item.id === produto.id ? { ...item, quantidade: item.quantidade + 1 } : item
        );
      }

      return [...prevCart, { ...produto, quantidade: 1 }];
    });
  };

  // Remover ou diminuir quantidade de um item
  const removeFromCart = (produtoId) => {
    setCart((prevCart) => {
      const itemExistente = prevCart.find((item) => item.id === produtoId);

      if (itemExistente.quantidade === 1) {
        return prevCart.filter((item) => item.id !== produtoId);
      }

      return prevCart.map((item) =>
        item.id === produtoId ? { ...item, quantidade: item.quantidade - 1 } : item
      );
    });
  };

  // Limpar toda a sacola
  const clearCart = () => setCart([]);

  // Cálculos automáticos de totais
  const totalItens = cart.reduce((acc, item) => acc + item.quantidade, 0);
  const precoTotal = cart.reduce((acc, item) => acc + item.quantidade * parseFloat(item.preco), 0);

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, clearCart, totalItens, precoTotal }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);