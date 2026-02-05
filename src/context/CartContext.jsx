import React, { createContext, useState, useEffect, useContext } from 'react';
import { db, auth } from '../firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { safeLocalStorage } from '../utils/safeStorage';

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
    const [cartItems, setCartItems] = useState(() => {
        try {
            const storedCart = safeLocalStorage.getItem('cartItems');
            return storedCart ? JSON.parse(storedCart) : [];
        } catch (error) {
            console.error("Failed to load cart from local storage", error);
            return [];
        }
    });

    const [sessionId] = useState(() => {
        let id = safeLocalStorage.getItem('cartSessionId');
        if (!id) {
            // Safer way to access randomUUID in browser
            id = (typeof crypto !== 'undefined' && crypto.randomUUID)
                ? crypto.randomUUID()
                : Math.random().toString(36).substring(2) + Date.now().toString(36);
            safeLocalStorage.setItem('cartSessionId', id);
        }
        return id;
    });

    const [customerDetails, setCustomerDetails] = useState({
        email: '',
        phone: '',
        name: ''
    });

    const [currentStage, setCurrentStage] = useState('Cart Page');

    // 1. Immediate Local Storage Sync
    useEffect(() => {
        try {
            safeLocalStorage.setItem('cartItems', JSON.stringify(cartItems));
        } catch (error) {
            console.error("Failed to save cart to local storage:", error);
        }
    }, [cartItems]);

    // 2. Debounced Firestore Sync (Abandoned Cart Recovery)
    useEffect(() => {
        const handler = setTimeout(() => {
            try {
                if (cartItems.length === 0) return;

                const syncCart = async () => {
                    try {
                        const cartId = auth.currentUser ? auth.currentUser.uid : sessionId;
                        const currentCartStr = JSON.stringify(cartItems);

                        // Check if we already synced this state
                        const lastSyncedKey = `last_sync_${cartId}`;
                        if (safeLocalStorage.getItem(lastSyncedKey) === currentCartStr) return;

                        const cartData = {
                            sessionId: sessionId,
                            uid: auth.currentUser?.uid || null,
                            email: customerDetails.email || auth.currentUser?.email || null,
                            customerName: customerDetails.name || auth.currentUser?.displayName || 'Guest',
                            customerPhone: customerDetails.phone || null,
                            items: cartItems,
                            total: cartItems.reduce((sum, item) => {
                                const effectivePrice = Number(item.salePrice) || Number(item.price);
                                return sum + (effectivePrice * item.quantity);
                            }, 0),
                            lastModified: serverTimestamp(),
                            recovered: false,
                            emailSent: false,
                            lastStepReached: currentStage
                        };

                        await setDoc(doc(db, 'abandoned_carts', cartId), cartData, { merge: true });
                        safeLocalStorage.setItem(lastSyncedKey, currentCartStr);
                        console.log("[QUOTA] Abandoned cart synced (Optimized)");
                    } catch (err) {
                        if (err.code === 'resource-exhausted') {
                            console.warn("[QUOTA] Limit reached, skipping abandoned cart sync.");
                        } else {
                            console.error("Error syncing abandoned cart:", err);
                        }
                    }
                };
                syncCart();
            } catch (error) {
                console.error("Failed to handle firestore persistence:", error);
            }
        }, 10000); // reduced to 10s for better recovery, but still debounced

        return () => clearTimeout(handler);
    }, [cartItems, currentStage, customerDetails, auth.currentUser, sessionId]);

    const updateCartStage = (stage) => {
        setCurrentStage(stage);
    };

    const updateCustomerInfo = (info) => {
        setCustomerDetails(prev => ({ ...prev, ...info }));
    };

    const parsePrice = (value) => {
        if (value === undefined || value === null || value === '') return null;
        const parsed = Number(value);
        return isNaN(parsed) ? null : parsed;
    };

    const addToCart = (product, quantity = 1) => {
        // Sanitize Product Data on Entry
        const safePrice = parsePrice(product.price) || 0;
        let safeSalePrice = parsePrice(product.salePrice);

        // Strict Rule: If salePrice is invalid (0) or not better than regular price, ignore it.
        // This fixes the "User sees regular price" bug by ensuring falsey/bad sale prices are NULLED.
        if (safeSalePrice !== null && (safeSalePrice <= 0 || safeSalePrice >= safePrice)) {
            safeSalePrice = null;
        }

        const sanitizedProduct = {
            ...product,
            price: safePrice,
            salePrice: safeSalePrice
        };

        setCartItems((prevItems) => {
            const existingItem = prevItems.find((item) => item.id === product.id);
            if (existingItem) {
                return prevItems.map((item) =>
                    item.id === product.id
                        ? {
                            ...item,
                            ...sanitizedProduct, // Overwrite with sanitized, fresh data
                            quantity: item.quantity + quantity
                        }
                        : item
                );
            }
            return [...prevItems, { ...sanitizedProduct, quantity }];
        });
    };

    const updateQuantity = (id, newQuantity) => {
        if (newQuantity < 1) {
            removeFromCart(id);
            // Dynamic import to avoid circular dependency
            import('react-hot-toast').then(({ toast }) => {
                toast.success('تم إزالة المنتج من السلة', {
                    icon: '🗑️',
                    position: 'bottom-right'
                });
            });
            return;
        }
        setCartItems((prevItems) =>
            prevItems.map((item) =>
                item.id === id ? { ...item, quantity: newQuantity } : item
            )
        );
    };

    const removeFromCart = (id) => {
        setCartItems((prevItems) => prevItems.filter((item) => item.id !== id));
    };

    const clearCart = () => {
        setCartItems([]);
    };

    const getCartTotal = () => {
        return cartItems.reduce((total, item) => {
            // Since we sanitized on entry, we can trust salePrice if it exists
            const effectivePrice = item.salePrice !== null ? item.salePrice : item.price;
            return total + (effectivePrice * item.quantity);
        }, 0);
    };

    const getCartCount = () => {
        return cartItems.reduce((count, item) => count + item.quantity, 0);
    };

    return (
        <CartContext.Provider value={{
            cartItems,
            setCartItems,
            addToCart,
            updateQuantity,
            removeFromCart,
            clearCart,
            getCartTotal,
            getCartCount,
            updateCartStage,
            updateCustomerInfo,
            currentStage
        }}>
            {children}
        </CartContext.Provider>
    );
};
