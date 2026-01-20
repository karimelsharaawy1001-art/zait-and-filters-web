import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { doc, getDoc, updateDoc, collection, getDocs, arrayUnion, arrayRemove, query, where, orderBy } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import {
    User,
    MapPin,
    Car as CarIcon,
    Plus,
    Trash2,
    Edit3,
    ChevronRight,
    Loader2,
    AlertCircle,
    CheckCircle2,
    Calendar,
    Settings,
    Package,
    FileText,
    Download
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useFilters } from '../context/FilterContext';
import { useSettings } from '../context/SettingsContext';
import MaintenanceReportTemplate from '../components/MaintenanceReportTemplate';

// IMPORTANT: We use native window.print() to avoid library-related crashes
// The print-only-section class is defined in index.css

const Profile = () => {
    const [activeTab, setActiveTab] = useState('garage');
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [carsData, setCarsData] = useState([]);
    const [carMakes, setCarMakes] = useState([]);
    const [filteredModels, setFilteredModels] = useState([]);
    const { userGarage } = useFilters();

    const [newCar, setNewCar] = useState({
        make: '',
        model: '',
        year: ''
    });
    const [saving, setSaving] = useState(false);
    const [orders, setOrders] = useState([]);
    const [fetchingOrders, setFetchingOrders] = useState(false);
    const { t, i18n } = useTranslation();
    const { settings } = useSettings();

    const handlePrint = () => {
        window.print();
    };

    useEffect(() => {
        fetchUserData();
        fetchGlobalCars();
    }, []);

    useEffect(() => {
        if (activeTab === 'orders' && orders.length === 0) {
            fetchOrders();
        }
    }, [activeTab, orders.length]);

    const fetchOrders = async () => {
        if (!auth.currentUser) return;
        setFetchingOrders(true);
        try {
            const q = query(
                collection(db, 'orders'),
                where('userId', '==', auth.currentUser.uid),
                orderBy('createdAt', 'desc')
            );
            const querySnapshot = await getDocs(q);
            const ordersList = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setOrders(ordersList);
        } catch (error) {
            console.error("Error fetching orders:", error);
            if (error.code === 'failed-precondition') {
                const q = query(
                    collection(db, 'orders'),
                    where('userId', '==', auth.currentUser.uid)
                );
                const querySnapshot = await getDocs(q);
                const ordersList = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
                setOrders(ordersList);
            }
        } finally {
            setFetchingOrders(false);
        }
    };

    const fetchUserData = async () => {
        if (!auth.currentUser) return;
        try {
            const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
            if (userDoc.exists()) {
                setUserData(userDoc.data());
            }
        } catch (error) {
            console.error("Error fetching user:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchGlobalCars = async () => {
        try {
            const carsSnapshot = await getDocs(collection(db, 'cars'));
            const carsList = carsSnapshot.docs.map(doc => doc.data());
            setCarsData(carsList);
            const uniqueMakes = [...new Set(carsList.map(c => c.make))].sort();
            setCarMakes(uniqueMakes);
        } catch (error) {
            console.error("Error fetching cars:", error);
        }
    };

    const handleMakeChange = (make) => {
        const models = carsData
            .filter(car => car.make === make)
            .map(car => car.model);
        setFilteredModels([...new Set(models)].sort());
        setNewCar(prev => ({ ...prev, make, model: '' }));
    };

    const handleAddCar = async (e) => {
        e.preventDefault();
        if (!newCar.make || !newCar.model || !newCar.year) {
            toast.error("Please fill all fields");
            return;
        }

        setSaving(true);
        try {
            const carId = crypto.randomUUID();
            const selectedCarData = carsData.find(c => c.make === newCar.make && c.model === newCar.model);

            const carToAdd = {
                id: carId,
                make: newCar.make,
                model: newCar.model,
                year: newCar.year,
                imageUrl: selectedCarData?.imageUrl || '',
                isActive: userGarage.length === 0
            };

            await updateDoc(doc(db, 'users', auth.currentUser.uid), {
                garage: arrayUnion(carToAdd)
            });

            toast.success("Car added to your garage!");
            setIsAddModalOpen(false);
            setNewCar({ make: '', model: '', year: '' });
        } catch (error) {
            console.error("Error adding car:", error);
            toast.error("Failed to add car");
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteCar = async (car) => {
        if (!window.confirm(`Remove ${car.make} ${car.model} from your garage?`)) return;

        try {
            await updateDoc(doc(db, 'users', auth.currentUser.uid), {
                garage: arrayRemove(car)
            });
            toast.success("Car removed");
        } catch (error) {
            console.error("Error removing car:", error);
            toast.error("Failed to remove car");
        }
    };

    const toggleCarActive = async (carId) => {
        const updatedGarage = userGarage.map(car => ({
            ...car,
            isActive: car.id === carId
        }));

        try {
            await updateDoc(doc(db, 'users', auth.currentUser.uid), {
                garage: updatedGarage
            });
        } catch (error) {
            console.error("Error toggling active car:", error);
        }
    };

    return (
        <div className="min-h-screen pt-24 pb-12 bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col md:flex-row gap-8">
                    {/* Sidebar Tabs */}
                    <div className="w-full md:w-64 flex-shrink-0">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-6 border-b border-gray-50">
                                <h2 className="text-xl font-black text-gray-900">My Account</h2>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Settings & Profile</p>
                            </div>
                            <nav className="p-2 space-y-1">
                                <button
                                    onClick={() => setActiveTab('info')}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'info' ? 'bg-orange-600 text-white shadow-lg shadow-orange-100' : 'text-gray-600 hover:bg-gray-50'}`}
                                >
                                    <User className="h-5 w-5" />
                                    <span className="text-sm font-bold">Personal Info</span>
                                </button>
                                <button
                                    onClick={() => setActiveTab('garage')}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'garage' ? 'bg-orange-600 text-white shadow-lg shadow-orange-100' : 'text-gray-600 hover:bg-gray-50'}`}
                                >
                                    <CarIcon className="h-5 w-5" />
                                    <span className="text-sm font-bold">My Garage</span>
                                </button>
                                <button
                                    onClick={() => setActiveTab('addresses')}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'addresses' ? 'bg-orange-600 text-white shadow-lg shadow-orange-100' : 'text-gray-600 hover:bg-gray-50'}`}
                                >
                                    <MapPin className="h-5 w-5" />
                                    <span className="text-sm font-bold">Address Book</span>
                                </button>
                                <button
                                    onClick={() => setActiveTab('orders')}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'orders' ? 'bg-orange-600 text-white shadow-lg shadow-orange-100' : 'text-gray-600 hover:bg-gray-50'}`}
                                >
                                    <Package className="h-5 w-5" />
                                    <span className="text-sm font-bold">{t('myOrders', 'My Orders')}</span>
                                </button>
                            </nav>
                        </div>
                    </div>

                    {/* Main Content Area */}
                    <div className="flex-1">
                        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
                            {activeTab === 'garage' && (
                                <div className="space-y-8 animate-in fade-in duration-500">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="text-2xl font-black text-gray-900">My Garage</h3>
                                            <p className="text-gray-500 font-medium">Manage your vehicles for custom parts compatibility.</p>
                                        </div>
                                        <button
                                            onClick={() => setIsAddModalOpen(true)}
                                            className="flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-2xl font-black text-sm hover:bg-red-600 transition-all shadow-xl shadow-gray-200"
                                        >
                                            <Plus className="h-5 w-5" />
                                            Add New Car
                                        </button>
                                    </div>

                                    {userGarage.length === 0 ? (
                                        <div className="py-20 flex flex-col items-center justify-center text-center bg-gray-50 rounded-[2.5rem] border-2 border-dashed border-gray-200">
                                            <div className="bg-white p-6 rounded-full shadow-lg mb-6">
                                                <CarIcon className="h-16 w-16 text-gray-300" />
                                            </div>
                                            <h4 className="text-xl font-black text-gray-900">Your Garage is Empty</h4>
                                            <p className="text-gray-500 mt-2 max-w-xs mx-auto">Add your car for a personalized shopping experience and guaranteed fitment.</p>
                                            <button
                                                onClick={() => setIsAddModalOpen(true)}
                                                className="mt-8 text-orange-600 font-black flex items-center gap-2 hover:underline"
                                            >
                                                <Plus className="h-5 w-5" />
                                                Add your first car
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                            {userGarage.map((car) => (
                                                <div
                                                    key={car.id}
                                                    onClick={() => toggleCarActive(car.id)}
                                                    className={`group relative p-6 rounded-[2rem] border-2 transition-all cursor-pointer ${car.isActive ? 'border-orange-600 bg-orange-50/50 shadow-xl shadow-orange-100' : 'border-gray-100 hover:border-gray-200 hover:shadow-lg'}`}
                                                >
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex items-center gap-4">
                                                            <div className={`w-24 h-16 rounded-2xl overflow-hidden flex-shrink-0 ${car.isActive ? 'bg-orange-100' : 'bg-gray-100'} transition-all`}>
                                                                {car.imageUrl ? (
                                                                    <img src={car.imageUrl} alt={`${car.make} ${car.model}`} className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                                        <CarIcon className="h-8 w-8" />
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div>
                                                                <h4 className="text-lg font-black text-gray-900">{car.make} {car.model}</h4>
                                                                <div className="flex items-center gap-2 text-sm font-bold text-gray-500 mt-1">
                                                                    <Calendar className="h-4 w-4" />
                                                                    {car.year}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDeleteCar(car);
                                                            }}
                                                            className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                                                        >
                                                            <Trash2 className="h-5 w-5" />
                                                        </button>
                                                    </div>

                                                    {car.isActive && (
                                                        <div className="mt-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-orange-600">
                                                            <CheckCircle2 className="h-3 w-3" />
                                                            Primary Vehicle
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'info' && (
                                <div className="space-y-6 animate-in fade-in duration-500">
                                    <h3 className="text-2xl font-black text-gray-900">Personal Information</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Full Name</label>
                                            <p className="bg-gray-50 p-4 rounded-2xl text-sm font-bold text-gray-700">{userData?.fullName}</p>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Email Address</label>
                                            <p className="bg-gray-50 p-4 rounded-2xl text-sm font-bold text-gray-700">{userData?.email}</p>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Phone Number</label>
                                            <p className="bg-gray-50 p-4 rounded-2xl text-sm font-bold text-gray-700">{userData?.phoneNumber}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'addresses' && (
                                <div className="space-y-6 animate-in fade-in duration-500">
                                    <h3 className="text-2xl font-black text-gray-900">Address Book</h3>
                                    <p className="text-gray-500">Manage your saved shipping addresses for faster checkout.</p>
                                    <div className="p-8 border-2 border-dashed border-gray-100 rounded-[2rem] text-center">
                                        <p className="text-gray-400 font-bold">Manage this during checkout for now.</p>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'orders' && (
                                <div className="space-y-6 animate-in fade-in duration-500">
                                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                        <div>
                                            <h3 className="text-2xl font-black text-gray-900">{t('myOrders', 'My Orders')}</h3>
                                            <p className="text-gray-500 font-medium">View your order history and maintenance tracking.</p>
                                        </div>
                                        <button
                                            onClick={handlePrint}
                                            disabled={orders.filter(o => o.status?.toLowerCase() === 'delivered').length === 0}
                                            className="flex items-center gap-2 bg-red-600 text-white px-6 py-3 rounded-2xl font-black text-sm hover:bg-red-700 transition-all shadow-xl shadow-red-100 disabled:opacity-50 disabled:bg-gray-400 disabled:shadow-none"
                                        >
                                            <FileText className="h-4 w-4" />
                                            {t('downloadMaintenanceReport')}
                                        </button>
                                    </div>

                                    {fetchingOrders ? (
                                        <div className="flex justify-center py-12">
                                            <Loader2 className="h-10 w-10 animate-spin text-orange-600" />
                                        </div>
                                    ) : orders.length === 0 ? (
                                        <div className="py-20 flex flex-col items-center justify-center text-center bg-gray-50 rounded-[2.5rem] border-2 border-dashed border-gray-200">
                                            <div className="bg-white p-6 rounded-full shadow-lg mb-6">
                                                <Package className="h-16 w-16 text-gray-300" />
                                            </div>
                                            <h4 className="text-xl font-black text-gray-900">No Orders Yet</h4>
                                            <p className="text-gray-500 mt-2 max-w-xs mx-auto">Once you place an order, it will appear here with your car mileage history.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-6">
                                            {orders.map((order) => (
                                                <div key={order.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:border-orange-200 transition-colors">
                                                    <div className="bg-gray-50 px-6 py-4 flex flex-wrap justify-between items-center gap-4 border-b border-gray-100">
                                                        <div className="flex gap-6">
                                                            <div>
                                                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Order #</p>
                                                                <p className="text-sm font-black text-gray-900">#{order.orderNumber || order.id.slice(-6).toUpperCase()}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Date</p>
                                                                <p className="text-sm font-bold text-gray-700">
                                                                    {order.createdAt?.seconds ? new Date(order.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}
                                                                </p>
                                                            </div>
                                                            {order.currentMileage && (
                                                                <div className="bg-orange-50 border border-orange-100 px-3 py-1 rounded-lg flex items-center gap-1.5 shadow-sm">
                                                                    <svg className="w-3 h-3 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                                                    </svg>
                                                                    <p className="text-[10px] font-black text-orange-700 uppercase tracking-tight">
                                                                        {t('mileage', 'Mileage')}: {order.currentMileage} كم
                                                                    </p>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className={`px-2 py-0.5 text-[9px] font-black rounded-full uppercase tracking-tighter
                                                                ${order.paymentStatus === 'Paid' ? 'bg-green-100 text-green-700' : ''}
                                                                ${order.paymentStatus === 'Pending' ? 'bg-gray-100 text-gray-700' : ''}
                                                                ${order.paymentStatus === 'Failed' ? 'bg-red-100 text-red-700' : ''}
                                                                ${order.paymentStatus === 'Refunded' ? 'bg-orange-100 text-orange-700' : ''}
                                                            `}>
                                                                {i18n.language === 'ar' ? (
                                                                    order.paymentStatus === 'Paid' ? 'تم الدفع' :
                                                                        order.paymentStatus === 'Pending' ? 'لم يتم الدفع' :
                                                                            order.paymentStatus === 'Failed' ? 'فشل الدفع' :
                                                                                order.paymentStatus === 'Refunded' ? 'مسترجع' : 'غير مدفوع'
                                                                ) : order.paymentStatus || 'Unpaid'}
                                                            </span>
                                                            <span className={`px-3 py-1 text-[10px] font-black rounded-full uppercase tracking-tighter
                                                                ${order.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' : ''}
                                                                ${order.status === 'Processing' ? 'bg-blue-100 text-blue-700' : ''}
                                                                ${order.status === 'Shipped' ? 'bg-purple-100 text-purple-700' : ''}
                                                                ${order.status === 'Delivered' ? 'bg-green-100 text-green-700' : ''}
                                                                ${order.status === 'Cancelled' ? 'bg-red-100 text-red-700' : ''}
                                                            `}>
                                                                {order.status}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="p-6">
                                                        <div className="divide-y divide-gray-50">
                                                            {order.items?.map((item, idx) => (
                                                                <div key={idx} className="py-4 first:pt-0 last:pb-0 flex items-center gap-4">
                                                                    <img src={item.image} alt={item.name} className="w-12 h-12 object-cover rounded-lg border border-gray-100" />
                                                                    <div className="flex-1">
                                                                        <h4 className="text-sm font-bold text-gray-900 mb-1">{item.name}</h4>
                                                                        <p className="text-[10px] text-gray-500 font-medium">
                                                                            {item.partBrand || item.brand} • {item.quantity} Qty
                                                                        </p>
                                                                    </div>
                                                                    <div className="text-right">
                                                                        <p className="text-sm font-black text-gray-900">{item.price} EGP</p>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Add Car Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-8 pb-0 flex justify-between items-center">
                            <div>
                                <h3 className="text-2xl font-black text-gray-900">Add to Garage</h3>
                                <p className="text-gray-500 text-sm font-medium">Select your vehicle details</p>
                            </div>
                            <button onClick={() => setIsAddModalOpen(false)} className="bg-gray-100 p-2 rounded-xl border border-gray-200 hover:bg-gray-200 transition-colors">
                                <Plus className="h-6 w-6 rotate-45" />
                            </button>
                        </div>

                        <form onSubmit={handleAddCar} className="p-8 space-y-6">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Car Make</label>
                                    <select
                                        required
                                        value={newCar.make}
                                        onChange={(e) => handleMakeChange(e.target.value)}
                                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-4 text-sm font-bold focus:ring-2 focus:ring-orange-600 outline-none transition-all"
                                    >
                                        <option value="">Select Make</option>
                                        {carMakes.map(make => (
                                            <option key={make} value={make}>{make}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Car Model</label>
                                    <select
                                        required
                                        disabled={!newCar.make}
                                        value={newCar.model}
                                        onChange={(e) => setNewCar(prev => ({ ...prev, model: e.target.value }))}
                                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-4 text-sm font-bold focus:ring-2 focus:ring-orange-600 outline-none transition-all disabled:opacity-50"
                                    >
                                        <option value="">Select Model</option>
                                        {filteredModels.map(model => (
                                            <option key={model} value={model}>{model}</option>
                                        ))}
                                    </select>
                                </div>

                                {newCar.model && (
                                    <div className="relative group">
                                        <div className="w-full h-40 bg-gray-50 rounded-[2rem] border border-gray-100 overflow-hidden relative">
                                            {carsData.find(c => c.make === newCar.make && c.model === newCar.model)?.imageUrl ? (
                                                <img
                                                    src={carsData.find(c => c.make === newCar.make && c.model === newCar.model).imageUrl}
                                                    alt="Car Preview"
                                                    className="w-full h-full object-contain"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 gap-2">
                                                    <CarIcon className="w-12 h-12" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">No Image Available</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Manufacture Year</label>
                                    <input
                                        type="number"
                                        required
                                        placeholder="e.g. 2022"
                                        value={newCar.year}
                                        onChange={(e) => setNewCar(prev => ({ ...prev, year: e.target.value }))}
                                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-4 text-sm font-bold focus:ring-2 focus:ring-orange-600 outline-none transition-all"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={saving}
                                className="w-full bg-orange-600 text-white py-5 rounded-2xl font-black text-lg hover:bg-orange-700 transition-all shadow-xl shadow-orange-100 flex items-center justify-center gap-3 disabled:opacity-50"
                            >
                                {saving ? (
                                    <Loader2 className="h-6 w-6 animate-spin" />
                                ) : (
                                    <>
                                        <CarIcon className="h-6 w-6" />
                                        Save to My Garage
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Print-only section (Hidden on screen via index.css) */}
            <div className="print-only-section">
                <MaintenanceReportTemplate
                    user={userData || auth.currentUser}
                    orders={orders.filter(o => o.status?.toLowerCase() === 'delivered')}
                    siteName={settings.siteName || "Zait & Filters"}
                    logoUrl={settings.siteLogo}
                />
            </div>
        </div>
    );
};

export default Profile;
