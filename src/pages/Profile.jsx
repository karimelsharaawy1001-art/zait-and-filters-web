import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { doc, getDoc, updateDoc, collection, getDocs, arrayUnion, arrayRemove, query, where, orderBy, addDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { databases } from '../appwrite';
import { Query } from 'appwrite';
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
    Download,
    LogOut,
    Home,
    Building,
    Briefcase,
    Building2,
    Map,
    Printer
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useFilters } from '../context/FilterContext';
import { useSettings } from '../context/SettingsContext';
import MaintenanceReportTemplate from '../components/MaintenanceReportTemplate';
import { getOptimizedImage } from '../utils/cloudinaryUtils';

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
    const isAr = i18n.language === 'ar';
    const { user: appwriteUser } = useAuth(); // Add Appwrite user

    // Address Book States
    const [savedAddresses, setSavedAddresses] = useState([]);
    const [fetchingAddresses, setFetchingAddresses] = useState(false);
    const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
    const [shippingRates, setShippingRates] = useState([]);
    const [newAddress, setNewAddress] = useState({
        label: '',
        governorate: '',
        city: '',
        detailedAddress: ''
    });

    const handlePrint = () => {
        window.print();
    };

    useEffect(() => {
        fetchUserData();
        fetchGlobalCars();
    }, []);

    useEffect(() => {
        if (activeTab === 'addresses') {
            fetchAddresses();
            fetchShippingRates();
        }
    }, [activeTab]);

    useEffect(() => {
        if (activeTab === 'orders' && orders.length === 0) {
            fetchOrders();
        }
    }, [activeTab, orders.length]);

    const fetchOrders = async () => {
        if (!appwriteUser?.email) return;

        setFetchingOrders(true);
        try {
            const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
            const ORDERS_COLLECTION = import.meta.env.VITE_APPWRITE_ORDERS_COLLECTION_ID;

            // Fetch all orders and filter client-side
            const response = await databases.listDocuments(
                DATABASE_ID,
                ORDERS_COLLECTION,
                [Query.limit(1000)]
            );

            // Filter orders by matching email
            const userOrders = response.documents.filter(doc => {
                if (doc.email && doc.email.toLowerCase() === appwriteUser.email.toLowerCase()) {
                    return true;
                }

                if (doc.customerInfo) {
                    try {
                        const customerData = typeof doc.customerInfo === 'string'
                            ? JSON.parse(doc.customerInfo)
                            : doc.customerInfo;

                        if (customerData.email && customerData.email.toLowerCase() === appwriteUser.email.toLowerCase()) {
                            return true;
                        }
                    } catch (e) {
                        console.warn('Could not parse customerInfo for order:', doc.$id);
                    }
                }

                return false;
            });

            const ordersList = userOrders.map(doc => ({
                id: doc.$id,
                ...doc
            })).sort((a, b) => {
                const numA = parseInt(a.orderNumber) || 0;
                const numB = parseInt(b.orderNumber) || 0;
                return numB - numA;
            });

            setOrders(ordersList);
        } catch (error) {
            console.error("Error fetching orders:", error);
            toast.error(isAr ? 'فشل تحميل الطلبات' : 'Failed to load orders');
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
    const fetchAddresses = async () => {
        if (!auth.currentUser) return;
        setFetchingAddresses(true);
        try {
            const addressesSnap = await getDocs(collection(db, 'users', auth.currentUser.uid, 'addresses'));
            const addresses = addressesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setSavedAddresses(addresses);
        } catch (error) {
            console.error("Error fetching addresses:", error);
        } finally {
            setFetchingAddresses(false);
        }
    };

    const fetchShippingRates = async () => {
        try {
            const querySnapshot = await getDocs(collection(db, 'shipping_rates'));
            const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Safety sort
            const sortedData = data.sort((a, b) => {
                const govA = a?.governorate || '';
                const govB = b?.governorate || '';
                return govA.localeCompare(govB);
            });

            setShippingRates(sortedData);
        } catch (error) {
            console.error("Error fetching shipping rates:", error);
        }
    };

    const handleAddAddress = async (e) => {
        e.preventDefault();
        if (!newAddress.governorate || !newAddress.city || !newAddress.detailedAddress) {
            toast.error(isAr ? "يرجى ملء جميع الحقول الإجبارية" : "Please fill all required fields");
            return;
        }

        setSaving(true);
        try {
            const addressData = {
                ...newAddress,
                label: newAddress.label || (isAr ? 'المنزل' : 'Home'),
                createdAt: serverTimestamp()
            };

            const docRef = await addDoc(collection(db, 'users', auth.currentUser.uid, 'addresses'), addressData);
            setSavedAddresses(prev => [{ id: docRef.id, ...addressData }, ...prev]);

            toast.success(isAr ? "تم إضافة العنوان بنجاح" : "Address added successfully!");
            setIsAddressModalOpen(false);
            setNewAddress({ label: '', governorate: '', city: '', detailedAddress: '' });
        } catch (error) {
            console.error("Error adding address:", error);
            toast.error(isAr ? "فشل إضافة العنوان" : "Failed to add address");
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteAddress = async (addressId) => {
        if (!window.confirm(isAr ? "هل أنت متأكد من حذف هذا العنوان؟" : "Are you sure you want to delete this address?")) return;

        try {
            await deleteDoc(doc(db, 'users', auth.currentUser.uid, 'addresses', addressId));
            setSavedAddresses(prev => prev.filter(a => a.id !== addressId));
            toast.success(isAr ? "تم حذف العنوان" : "Address deleted");
        } catch (error) {
            console.error("Error deleting address:", error);
            toast.error(isAr ? "فشل حذف العنوان" : "Failed to delete address");
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
                                <div className="pt-2 mt-2 border-t border-gray-100">
                                    <button
                                        onClick={async () => {
                                            try {
                                                await signOut(auth);
                                                window.location.href = '/';
                                            } catch (error) {
                                                console.error("Logout Error:", error);
                                                toast.error("Failed to logout");
                                            }
                                        }}
                                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-[#28B463] hover:bg-[#28B463]/10"
                                    >
                                        <LogOut className="h-5 w-5" />
                                        <span className="text-sm font-bold">{t('signOut', 'Sign Out')}</span>
                                    </button>
                                </div>
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
                                            className="flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-2xl font-black text-sm hover:bg-[#28B463] transition-all shadow-xl shadow-gray-200"
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
                                                                    <img src={getOptimizedImage(car.imageUrl, 'f_auto,q_auto,w_300')} alt={`${car.make} ${car.model}`} className="w-full h-full object-cover" />
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
                                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                        <div>
                                            <h3 className="text-2xl font-black text-gray-900">{isAr ? 'دفتر العناوين' : 'Address Book'}</h3>
                                            <p className="text-gray-500 font-medium">{isAr ? 'إدارة عناوين الشحن الخاصة بك لعملية دفع أسرع.' : 'Manage your saved shipping addresses for faster checkout.'}</p>
                                        </div>
                                        <button
                                            onClick={() => setIsAddressModalOpen(true)}
                                            className="flex items-center gap-2 bg-orange-600 text-white px-6 py-3 rounded-2xl font-black text-sm hover:bg-orange-700 transition-all shadow-xl shadow-orange-100"
                                        >
                                            <Plus className="h-4 w-4" />
                                            {isAr ? 'إضافة عنوان جديد' : 'Add New Address'}
                                        </button>
                                    </div>

                                    {fetchingAddresses ? (
                                        <div className="flex justify-center py-12">
                                            <Loader2 className="h-10 w-10 animate-spin text-orange-600" />
                                        </div>
                                    ) : savedAddresses.length === 0 ? (
                                        <div className="py-20 flex flex-col items-center justify-center text-center bg-gray-50 rounded-[2.5rem] border-2 border-dashed border-gray-200">
                                            <div className="bg-white p-6 rounded-full shadow-lg mb-6">
                                                <MapPin className="h-16 w-16 text-gray-300" />
                                            </div>
                                            <h4 className="text-xl font-black text-gray-900">{isAr ? 'لا يوجد عناوين' : 'No Addresses Yet'}</h4>
                                            <p className="text-gray-500 mt-2 max-w-xs mx-auto">{isAr ? 'أضف عناوينك لسهولة الوصول إليها لاحقاً.' : 'Add your addresses for easy access during checkout.'}</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {savedAddresses.map((addr) => {
                                                const Icon = addr.label?.toLowerCase() === 'home' || addr.labelAr === 'المنزل' ? Home :
                                                    addr.label?.toLowerCase() === 'office' || addr.label?.toLowerCase() === 'work' || addr.labelAr === 'العمل' ? Building : MapPin;
                                                return (
                                                    <div key={addr.id} className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-gray-100 hover:border-orange-200 transition-all group relative overflow-hidden">
                                                        <div className={`flex items-start gap-4 ${isAr ? 'flex-row-reverse' : ''}`}>
                                                            <div className="bg-orange-600 p-3 rounded-2xl text-white shadow-lg shadow-orange-100">
                                                                <Icon className="h-5 w-5" />
                                                            </div>
                                                            <div className={`flex-1 min-w-0 ${isAr ? 'text-right' : 'text-left'}`}>
                                                                <h4 className="text-lg font-black text-gray-900 truncate">{addr.label}</h4>
                                                                <p className="text-sm font-bold text-orange-600 mt-1">{addr.city}, {addr.governorate}</p>
                                                                <p className="text-sm text-gray-500 mt-2 font-medium leading-relaxed">{addr.detailedAddress}</p>
                                                            </div>
                                                            <button
                                                                onClick={() => handleDeleteAddress(addr.id)}
                                                                className="opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                                            >
                                                                <Trash2 className="h-5 w-5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
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
                                            disabled={orders.filter(o => o.status === 'Delivered' || o.status === 'Completed').length === 0}
                                            className="flex items-center gap-2 bg-[#28B463] text-white px-6 py-3 rounded-2xl font-black text-sm hover:bg-[#219653] transition-all shadow-xl shadow-[#28B463]/20 disabled:opacity-50 disabled:bg-gray-400 disabled:shadow-none"
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
                                                                ${order.paymentStatus === 'Paid' ? 'bg-green-100 text-green-700 font-bold' : ''}
                                                                ${order.paymentStatus === 'Pending' ? 'bg-gray-100 text-gray-700 font-bold' : ''}
                                                                ${order.paymentStatus === 'Failed' ? 'bg-red-100 text-red-700 font-bold' : ''}
                                                                ${order.paymentStatus === 'Refunded' ? 'bg-orange-100 text-orange-700 font-bold' : ''}
                                                                ${order.paymentStatus === 'Awaiting Verification' ? 'bg-blue-100 text-blue-700 font-bold' : ''}
                                                                ${!['Paid', 'Pending', 'Failed', 'Refunded', 'Awaiting Verification'].includes(order.paymentStatus) ? 'bg-gray-100 text-gray-700 font-bold' : ''}
                                                            `}>
                                                                {isAr ? (
                                                                    order.paymentStatus === 'Paid' ? t('paymentPaid') :
                                                                        order.paymentStatus === 'Pending' ? t('paymentPending') :
                                                                            order.paymentStatus === 'Failed' ? t('paymentFailed') :
                                                                                order.paymentStatus === 'Refunded' ? t('paymentRefunded') :
                                                                                    order.paymentStatus === 'Awaiting Verification' ? t('paymentAwaitingVerification') : t('paymentUnpaid')
                                                                ) : order.paymentStatus || 'Unpaid'}
                                                            </span>
                                                            <span className={`px-3 py-1 text-[10px] font-black rounded-full uppercase tracking-tighter
                                                                ${order.status === 'Pending' ? 'bg-yellow-100 text-yellow-700 font-bold' : ''}
                                                                ${order.status === 'Processing' ? 'bg-blue-100 text-blue-700 font-bold' : ''}
                                                                ${order.status === 'Shipped' ? 'bg-purple-100 text-purple-700 font-bold' : ''}
                                                                ${order.status === 'Delivered' ? 'bg-green-100 text-green-700 font-bold' : ''}
                                                                ${order.status === 'Completed' ? 'bg-green-600 text-white font-bold' : ''}
                                                                ${order.status === 'Cancelled' ? 'bg-red-100 text-red-700 font-bold' : ''}
                                                                ${order.status === 'Awaiting Payment Verification' ? 'bg-blue-600 text-white font-bold' : ''}
                                                                ${!['Pending', 'Processing', 'Shipped', 'Delivered', 'Completed', 'Cancelled', 'Awaiting Payment Verification'].includes(order.status) ? 'bg-gray-100 text-gray-700 font-bold' : ''}
                                                            `}>
                                                                {(() => {
                                                                    const statuses = {
                                                                        'Pending': t('statusPending'),
                                                                        'Processing': t('statusProcessing'),
                                                                        'Shipped': t('statusShipped'),
                                                                        'Delivered': t('statusDelivered'),
                                                                        'Completed': t('statusCompleted'),
                                                                        'Cancelled': t('statusCancelled'),
                                                                        'Awaiting Payment Verification': t('statusAwaitingPaymentVerification')
                                                                    };
                                                                    return statuses[order.status] || order.status;
                                                                })()}
                                                            </span>

                                                            <div className="flex items-center gap-1 border-l border-gray-200 ml-2 pl-2">
                                                                <button
                                                                    onClick={() => window.open(`/print-invoice/${order.id}`, '_blank')}
                                                                    className="p-1.5 text-gray-400 hover:text-black transition-colors"
                                                                    title={isAr ? "طباعة الفاتورة" : "Print Invoice"}
                                                                >
                                                                    <Printer className="w-4 h-4" />
                                                                </button>
                                                                <button
                                                                    onClick={() => generateInvoice(order)}
                                                                    className="p-1.5 text-[#28B463] hover:text-green-700 transition-colors"
                                                                    title={isAr ? "تحميل الفاتورة" : "Download Invoice"}
                                                                >
                                                                    <Download className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="p-6">
                                                        <div className="divide-y divide-gray-50">
                                                            {order.items?.map((item, idx) => (
                                                                <div key={idx} className="py-4 first:pt-0 last:pb-0 flex items-center gap-4">
                                                                    <img src={getOptimizedImage(item.image, 'f_auto,q_auto,w_200')} alt={`${item.name} - ${item.partBrand || item.brand || ''}`} className="w-12 h-12 object-cover rounded-lg border border-gray-100" />
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

            {/* Add Address Modal */}
            {isAddressModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden relative animate-in zoom-in-95 duration-300">
                        <button
                            onClick={() => setIsAddressModalOpen(false)}
                            className="absolute top-8 right-8 p-3 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-2xl transition-all z-10"
                        >
                            <Trash2 className="h-6 w-6 rotate-45" />
                        </button>

                        <form onSubmit={handleAddAddress} className="p-10 space-y-8">
                            <div className="space-y-2">
                                <h3 className={`text-3xl font-black text-gray-900 ${isAr ? 'text-right' : ''}`}>
                                    {isAr ? 'إضافة عنوان جديد' : 'Add New Address'}
                                </h3>
                                <p className={`text-gray-500 font-medium ${isAr ? 'text-right' : ''}`}>
                                    {isAr ? 'أدخل تفاصيل العنوان الخاص بك للشحن.' : 'Enter your address details for shipping.'}
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2 space-y-2">
                                    <label className={`text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1 ${isAr ? 'text-right block' : ''}`}>{isAr ? 'تسمية العنوان (مثال: المنزل، العمل)' : 'Address Label (e.g. Home, Work)'}</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder={isAr ? 'مثال: المنزل' : 'e.g. Home'}
                                        value={newAddress.label}
                                        onChange={(e) => setNewAddress(prev => ({ ...prev, label: e.target.value }))}
                                        className={`w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold text-[#1A1A1A] placeholder:text-gray-400 focus:ring-2 focus:ring-orange-600 outline-none transition-all ${isAr ? 'text-right' : ''}`}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className={`text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1 ${isAr ? 'text-right block' : ''}`}>{isAr ? 'المحافظة' : 'Governorate'}</label>
                                    <select
                                        required
                                        value={newAddress.governorate}
                                        onChange={(e) => setNewAddress(prev => ({ ...prev, governorate: e.target.value }))}
                                        className={`w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold text-[#1A1A1A] focus:ring-2 focus:ring-orange-600 outline-none transition-all ${isAr ? 'text-right' : ''}`}
                                    >
                                        <option value="">{isAr ? 'اختر المحافظة' : 'Select Governorate'}</option>
                                        {shippingRates.map(rate => (
                                            <option key={rate.id} value={rate.governorate}>{rate.governorate}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className={`text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1 ${isAr ? 'text-right block' : ''}`}>{isAr ? 'المدينة / المنطقة' : 'City / Area'}</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder={isAr ? 'مثال: المعادي' : 'e.g. Maadi'}
                                        value={newAddress.city}
                                        onChange={(e) => setNewAddress(prev => ({ ...prev, city: e.target.value }))}
                                        className={`w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold text-[#1A1A1A] placeholder:text-gray-400 focus:ring-2 focus:ring-orange-600 outline-none transition-all ${isAr ? 'text-right' : ''}`}
                                    />
                                </div>

                                <div className="md:col-span-2 space-y-2">
                                    <label className={`text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1 ${isAr ? 'text-right block' : ''}`}>{isAr ? 'العنوان بالتفصيل' : 'Detailed Address'}</label>
                                    <textarea
                                        required
                                        rows={3}
                                        placeholder={isAr ? 'المبنى، الشارع، الدور، الشقة...' : 'Building, Street, Floor, Apartment...'}
                                        value={newAddress.detailedAddress}
                                        onChange={(e) => setNewAddress(prev => ({ ...prev, detailedAddress: e.target.value }))}
                                        className={`w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold text-[#1A1A1A] placeholder:text-gray-400 focus:ring-2 focus:ring-orange-600 outline-none transition-all ${isAr ? 'text-right' : ''}`}
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={saving}
                                className="w-full bg-orange-600 text-white py-5 rounded-2xl font-black text-lg hover:bg-orange-700 active:scale-[0.98] transition-all shadow-xl shadow-orange-100 flex items-center justify-center gap-3 disabled:opacity-50"
                            >
                                {saving ? (
                                    <Loader2 className="h-6 w-6 animate-spin" />
                                ) : (
                                    <>
                                        <MapPin className="h-6 w-6" />
                                        {isAr ? 'حفظ العنوان' : 'Save Address'}
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Add Car Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-8 pb-0 flex justify-between items-center">
                            <div>
                                <h3 className="text-2xl font-black text-[#1A1A1A]">Add to Garage</h3>
                                <p className="text-gray-600 text-sm font-medium">Select your vehicle details</p>
                            </div>
                            <button onClick={() => setIsAddModalOpen(false)} className="bg-gray-100 p-2 rounded-xl border border-gray-200 hover:bg-gray-200 transition-colors">
                                <Plus className="h-6 w-6 rotate-45" />
                            </button>
                        </div>

                        <form onSubmit={handleAddCar} className="p-8 space-y-6">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Car Make</label>
                                    <select
                                        required
                                        value={newCar.make}
                                        onChange={(e) => handleMakeChange(e.target.value)}
                                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-4 text-sm font-bold text-[#1A1A1A] focus:ring-2 focus:ring-orange-600 outline-none transition-all"
                                    >
                                        <option value="">Select Make</option>
                                        {carMakes.map(make => (
                                            <option key={make} value={make}>{make}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Car Model</label>
                                    <select
                                        required
                                        disabled={!newCar.make}
                                        value={newCar.model}
                                        onChange={(e) => setNewCar(prev => ({ ...prev, model: e.target.value }))}
                                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-4 text-sm font-bold text-[#1A1A1A] focus:ring-2 focus:ring-orange-600 outline-none transition-all disabled:opacity-50"
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
                                                    src={getOptimizedImage(carsData.find(c => c.make === newCar.make && c.model === newCar.model).imageUrl, 'f_auto,q_auto,w_600')}
                                                    alt={`${newCar.make} ${newCar.model} preview`}
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
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Manufacture Year</label>
                                    <input
                                        type="number"
                                        required
                                        placeholder="e.g. 2022"
                                        value={newCar.year}
                                        onChange={(e) => setNewCar(prev => ({ ...prev, year: e.target.value }))}
                                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-4 text-sm font-bold text-[#1A1A1A] placeholder:text-gray-400 focus:ring-2 focus:ring-orange-600 outline-none transition-all"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={saving}
                                className="w-full bg-orange-600 text-white py-5 rounded-2xl font-black text-lg hover:bg-orange-700 active:scale-[0.98] transition-all shadow-xl shadow-orange-100 flex items-center justify-center gap-3 disabled:opacity-50"
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
                    orders={orders.filter(o => o.status === 'Delivered' || o.status === 'Completed')}
                    siteName={settings.siteName || "Zait & Filters"}
                    logoUrl={settings.siteLogo}
                />
            </div>
        </div>
    );
};

export default Profile;
