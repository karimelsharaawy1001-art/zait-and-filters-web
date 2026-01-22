import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import axios from 'axios';
import { ShoppingCart, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

const RecoverCart = () => {
    const [searchParams] = useSearchParams();
    const [status, setStatus] = useState('loading'); // loading, success, error
    const [customerName, setCustomerName] = useState('');
    const { setCartItems } = useCart();
    const navigate = useNavigate();
    const token = searchParams.get('token');

    useEffect(() => {
        const fetchAndRestoreCart = async () => {
            if (!token) {
                setStatus('error');
                return;
            }

            try {
                const response = await axios.get(`/api/get-recovery-cart?token=${token}`);
                const { items, customerName } = response.data;

                if (items && items.length > 0) {
                    setCustomerName(customerName);
                    // Update Cart Context
                    setCartItems(items);
                    setStatus('success');
                    toast.success('تم استعادة سلتك بنجاح!');

                    // Auto-redirect to cart after 3 seconds
                    setTimeout(() => {
                        navigate('/cart');
                    }, 3000);
                } else {
                    setStatus('error');
                }
            } catch (err) {
                console.error('Failed to recover cart:', err);
                setStatus('error');
                toast.error('حدث خطأ أثناء استعادة السلة.');
            }
        };

        fetchAndRestoreCart();
    }, [token, setCartItems, navigate]);

    return (
        <div className="min-h-[70vh] flex items-center justify-center px-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
                {status === 'loading' && (
                    <div className="space-y-4">
                        <div className="flex justify-center">
                            <Loader2 className="w-16 h-16 text-primary animate-spin" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800">جاري استعادة سلتك...</h2>
                        <p className="text-gray-500">لحظة واحدة بنرجعلك حاجتك</p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="space-y-6">
                        <div className="flex justify-center">
                            <div className="bg-green-100 p-4 rounded-full">
                                <CheckCircle2 className="w-16 h-16 text-green-600" />
                            </div>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800">حمد لله على السلامة {customerName || 'يا بطل'}!</h2>
                        <p className="text-gray-600">
                            تم استعادة جميع المنتجات اللي كانت في سلتك بنجاح.
                        </p>
                        <div className="pt-4">
                            <button
                                onClick={() => navigate('/cart')}
                                className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-4 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
                            >
                                <ShoppingCart className="w-5 h-5" />
                                الذهاب للسلة الآن
                            </button>
                        </div>
                        <p className="text-xs text-gray-400">سيتم تحويلك تلقائياً خلال 3 ثوانٍ</p>
                    </div>
                )}

                {status === 'error' && (
                    <div className="space-y-6">
                        <div className="flex justify-center">
                            <div className="bg-red-100 p-4 rounded-full">
                                <AlertCircle className="w-16 h-16 text-red-600" />
                            </div>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800">عذراً، الرابط غير صالح</h2>
                        <p className="text-gray-600">
                            يبدو أن رابط استعادة السلة قد انتهت صلاحيته أو أنه غير صحيح.
                        </p>
                        <div className="pt-4">
                            <button
                                onClick={() => navigate('/shop')}
                                className="w-full bg-gray-800 hover:bg-black text-white font-bold py-4 rounded-xl transition-all"
                            >
                                البدء في تسوق جديد
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RecoverCart;
