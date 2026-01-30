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

    // Synchronize with Local Storage and Firestore (for abandoned cart recovery)
    useEffect(() => {
        try {
            safeLocalStorage.setItem('cartItems', JSON.stringify(cartItems));

            if (cartItems.length > 0) {
                const syncCart = async () => {
                    try {
                        const cartId = auth.currentUser ? auth.currentUser.uid : sessionId;
                        const cartData = {
                            sessionId: sessionId,
                            uid: auth.currentUser?.uid || null,
                            email: customerDetails.email || auth.currentUser?.email || null,
                            customerName: customerDetails.name || auth.currentUser?.displayName || 'Guest',
                            customerPhone: customerDetails.phone || null,
                            items: cartItems,
                            total: cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0),
                            lastModified: serverTimestamp(),
                            recovered: false,
                            emailSent: false,
                            lastStepReached: currentStage
                        };

                        await setDoc(doc(db, 'abandoned_carts', cartId), cartData, { merge: true });
                    } catch (err) {
                        console.error("Error syncing abandoned cart:", err);
                    }
                };
                syncCart();
            }
        } catch (error) {
            console.error("Failed to handle cart persistence", error);
        }
    }, [cartItems, currentStage, customerDetails, auth.currentUser, sessionId]);

    const updateCartStage = (stage) => {
        setCurrentStage(stage);
    };

    const updateCustomerInfo = (info) => {
        setCustomerDetails(prev => ({ ...prev, ...info }));
    };

    const addToCart = (product, quantity = 1) => {
        setCartItems((prevItems) => {
            const existingItem = prevItems.find((item) => item.id === product.id);
            if (existingItem) {
                return prevItems.map((item) =>
                    item.id === product.id
                        ? { ...item, quantity: item.quantity + quantity }
                        : item
                );
            }
            return [...prevItems, { ...product, quantity }];
        });
    };

    const updateQuantity = (id, newQuantity) => {
        if (newQuantity < 1) {
            removeFromCart(id);
            // Dynamic import toast to avoid circular dependency or unnecessary load if not needed elsewhere
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
        return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
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
