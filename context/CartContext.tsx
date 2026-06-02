'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';


const CartContext = createContext<any>(null);


export const CartProvider = ({ children }: { children: React.ReactNode }) => {
  const [cart, setCart] = useState<any[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);


  // 1. تحميل السلة من LocalStorage عند بدء التشغيل
  useEffect(() => {
    const saved = localStorage.getItem('zait_cart');
    if (saved) {
      try { 
        setCart(JSON.parse(saved)); 
      } catch (e) { 
        console.error("خطأ في قراءة بيانات السلة المحفوظة:", e); 
      }
    }
    setIsInitialized(true);
  }, []);


  // 2. مزامنة أي تغيير في السلة مع LocalStorage فوراً
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem('zait_cart', JSON.stringify(cart));
    }
  }, [cart, isInitialized]);


  // 3. دالة الإضافة (تدعم استقبال كافة تفاصيل المنتج والكمية المطلوبة)
  const addToCart = (product: any, quantity: number = 1) => {
    setCart((prev) => {
      const exists = prev.find((i) => i.id === product.id);
      if (exists) {
        const updated = prev.map((i) =>
          i.id === product.id ? { ...i, quantity: i.quantity + quantity } : i
        );
        return updated.filter((i) => i.quantity > 0);
      }
      // إضافة المنتج لأول مرة مع كافة بياناته (ماركة، منشأ، سعر، صورة، سيارة)
      return [...prev, { ...product, quantity }];
    });
  };


  // 4. دالة الحذف أو تقليل الكمية
  const removeFromCart = (productId: string, decreaseOnly: boolean = false) => {
    setCart((prev) => {
      if (decreaseOnly) {
        return prev.map((item) =>
          item.id === productId && item.quantity > 1
            ? { ...item, quantity: item.quantity - 1 }
            : item
        );
      }
      return prev.filter((item) => item.id !== productId);
    });
  };


  // 5. تحديث سعر منتج موجود في السلة (للمزامنة مع أحدث أسعار قاعدة البيانات)
  const updateCartItemPrice = (productId: string, newPrice: number) => {
    setCart((prev) =>
      prev.map((item) =>
        item.id === productId ? { ...item, price: newPrice } : item
      )
    );
  };


  // 6. حساب الإجمالي النهائي (مع ضمان تحويل الأسعار لأرقام)
  const getCartTotal = () => {
    return cart.reduce((sum, item) => {
      const price = parseFloat(item.price || 0);
      const qty = parseInt(item.quantity || 1);
      return sum + (price * qty);
    }, 0);
  };


  // 7. حساب عدد القطع في السلة (للأيقونة في الهيدر)
  const getCartCount = () => {
    return cart.reduce((sum, item) => sum + (parseInt(item.quantity) || 0), 0);
  };


  const clearCart = () => {
    setCart([]);
    localStorage.removeItem('zait_cart');
  };


  return (
    <CartContext.Provider 
      value={{ 
        cart, 
        cartItems: cart, // دعم للمسمى القديم لضمان عدم حدوث Error
        addToCart, 
        removeFromCart, 
        updateCartItemPrice,
        getCartTotal, 
        getCartCount,
        clearCart, 
        isInitialized 
      }}
    >
      {children}
    </CartContext.Provider>
  );
};


export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    // إرجاع قيم افتراضية بدلاً من null لتجنب الـ Crash
    return { 
      cart: [], 
      cartItems: [], 
      addToCart: () => {}, 
      removeFromCart: () => {}, 
      updateCartItemPrice: () => {},
      getCartTotal: () => 0, 
      getCartCount: () => 0,
      clearCart: () => {},
      isInitialized: false 
    };
  }
  return context;
};