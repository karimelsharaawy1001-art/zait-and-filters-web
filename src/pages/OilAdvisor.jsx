import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import { useFilters } from '../context/FilterContext';
import { useNavigate } from 'react-router-dom';
import { Droplets, Settings, Info, ShoppingBag, Car, ChevronRight, Fuel } from 'lucide-react';

const OilAdvisor = () => {
    const { t, i18n } = useTranslation();
    const { activeCar } = useFilters();
    const navigate = useNavigate();


    // Dropdown/Technical State
    const [makes, setMakes] = useState([]);
    const [models, setModels] = useState([]);
    const [years, setYears] = useState([]);
    const [selectedMake, setSelectedMake] = useState('');
    const [selectedModel, setSelectedModel] = useState('');
    const [selectedYear, setSelectedYear] = useState('');
    const [specResult, setSpecResult] = useState(null);
    const [loading, setLoading] = useState(false);

    // 1. Initial Data Fetching

    const fetchMakes = async () => {
        try {
            const q = query(collection(db, 'car_specs'));
            const querySnapshot = await getDocs(q);
            const uniqueMakes = [...new Set(querySnapshot.docs.map(doc => doc.data().make))].sort();
            setMakes(uniqueMakes);
        } catch (error) {
            console.error("Error fetching makes:", error);
        }
    };

    useEffect(() => {
        fetchMakes();
    }, []);

    // 2. Interaction Handlers
    const handleMakeChange = async (make) => {
        setSelectedMake(make);
        setSelectedModel('');
        setSelectedYear('');
        setSpecResult(null);

        if (!make) {
            setModels([]);
            return;
        }

        try {
            const q = query(collection(db, 'car_specs'), where('make', '==', make));
            const querySnapshot = await getDocs(q);
            const uniqueModels = [...new Set(querySnapshot.docs.map(doc => doc.data().model))].sort();
            setModels(uniqueModels);
        } catch (error) {
            console.error("Error changing make:", error);
        }
    };

    const handleModelChange = async (model, makeOverride = null) => {
        const make = makeOverride || selectedMake;
        setSelectedModel(model);
        setSelectedYear('');
        setSpecResult(null);

        if (!make || !model) {
            setYears([]);
            return;
        }

        try {
            const q = query(collection(db, 'car_specs'), where('make', '==', make), where('model', '==', model));
            const querySnapshot = await getDocs(q);
            const uniqueYears = [...new Set(querySnapshot.docs.map(doc => doc.data().year))].sort((a, b) => b - a);
            setYears(uniqueYears);
        } catch (error) {
            console.error("Error changing model:", error);
        }
    };

    const handleYearChange = async (year) => {
        setSelectedYear(year);
        if (!year) return;

        setLoading(true);
        try {
            const q = query(
                collection(db, 'car_specs'),
                where('make', '==', selectedMake),
                where('model', '==', selectedModel),
                where('year', '==', year)
            );
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                setSpecResult(querySnapshot.docs[0].data());
            }
        } catch (error) {
            console.error("Error changing year:", error);
        } finally {
            setLoading(false);
        }
    };


    const handleGetForGarage = async () => {
        if (!activeCar) return;
        setLoading(true);
        try {
            setSelectedMake(activeCar.make);
            setSelectedModel(activeCar.model);
            setSelectedYear(activeCar.year);

            const q = query(
                collection(db, 'car_specs'),
                where('make', '==', activeCar.make),
                where('model', '==', activeCar.model),
                where('year', '==', String(activeCar.year))
            );
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                setSpecResult(querySnapshot.docs[0].data());
            } else {
                setSpecResult(null);
                handleMakeChange(activeCar.make);
            }
        } catch (error) {
            console.error("Error getting specs for garage:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleShopProducts = () => {
        if (!specResult) return;
        navigate(`/shop?viscosity=${specResult.motorOilViscosity}`);
    };

    const getSmartOilSuggestion = (capacity) => {
        if (!capacity || capacity <= 0) return null;
        if (capacity <= 1) return { jugs4l: 0, bottles1l: 1 };
        if (capacity <= 4) return { jugs4l: 1, bottles1l: 0 };

        const jugs = Math.floor(capacity / 4);
        const remainder = capacity % 4;
        const bottles = Math.ceil(remainder);

        return { jugs4l: jugs, bottles1l: bottles };
    };

    const smartSuggestion = specResult ? getSmartOilSuggestion(specResult.motorOilCapacity) : null;

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
                <div className="text-center mb-12">
                    <div className="inline-flex items-center justify-center p-3 bg-[#28B463]/10 rounded-2xl mb-4">
                        <Droplets className="h-8 w-8 text-[#28B463]" />
                    </div>
                    <h1 className="text-4xl font-black text-gray-900 mb-4">{t('oilAdvisor')}</h1>
                    <p className="text-gray-500 font-bold max-w-lg mx-auto leading-relaxed">
                        {t('selectVehicleDesc')}
                    </p>
                </div>


                {/* Dropdowns */}
                <div className="bg-white rounded-3xl shadow-xl p-8 mb-8 border border-gray-100">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">{t('make')}</label>
                            <select
                                value={selectedMake}
                                onChange={(e) => handleMakeChange(e.target.value)}
                                className="w-full bg-gray-50 border-2 border-transparent focus:border-[#28B463] rounded-2xl px-5 py-4 font-bold outline-none transition-all appearance-none text-gray-900"
                            >
                                <option value="">{t('selectMake')}</option>
                                {makes.map(make => <option key={make} value={make}>{make}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">{t('model')}</label>
                            <select
                                value={selectedModel}
                                onChange={(e) => handleModelChange(e.target.value)}
                                disabled={!selectedMake}
                                className="w-full bg-gray-50 border-2 border-transparent focus:border-[#28B463] rounded-2xl px-5 py-4 font-bold outline-none transition-all appearance-none disabled:opacity-50 text-gray-900"
                            >
                                <option value="">{t('selectModel')}</option>
                                {models.map(model => <option key={model} value={model}>{model}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">{t('year')}</label>
                            <select
                                value={selectedYear}
                                onChange={(e) => handleYearChange(e.target.value)}
                                disabled={!selectedModel}
                                className="w-full bg-gray-50 border-2 border-transparent focus:border-[#28B463] rounded-2xl px-5 py-4 font-bold outline-none transition-all appearance-none disabled:opacity-50 text-gray-900"
                            >
                                <option value="">{t('allYears')}</option>
                                {years.map(year => <option key={year} value={year}>{year}</option>)}
                            </select>
                        </div>
                    </div>

                    {activeCar && (
                        <div className="flex justify-center">
                            <button
                                onClick={handleGetForGarage}
                                className="flex items-center gap-3 px-8 py-4 bg-gray-900 hover:bg-black text-white rounded-2xl font-black transition-all active:scale-95 group shadow-lg"
                            >
                                <Car className="h-5 w-5 text-red-500 group-hover:rotate-12 transition-transform" />
                                {t('getSpecsForMyCar')}
                            </button>
                        </div>
                    )}
                </div>

                {/* Results */}
                {loading ? (
                    <div className="flex flex-col items-center py-20 animate-pulse">
                        <Settings className="h-12 w-12 text-gray-200 animate-spin mb-4" />
                        <div className="h-4 w-48 bg-gray-200 rounded-full"></div>
                    </div>
                ) : specResult ? (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100">
                            <div className="bg-gradient-to-r from-[#28B463] to-[#219653] p-8 text-white relative">
                                <div className="absolute top-0 right-0 p-8 opacity-10">
                                    <Car className="h-32 w-32" />
                                </div>
                                <div className="relative z-10">
                                    <div className="flex justify-between items-start mb-2">
                                        <h2 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-80">{t('technicalSpecs')}</h2>
                                        <div className="flex gap-2">
                                            <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter shadow-sm border border-white/10">
                                                {i18n.language === 'ar' ? '🚚 توصيل خلال 24-48 ساعة' : '🚚 Fast Delivery (24-48h)'}
                                            </span>
                                            <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter shadow-sm border border-white/10">
                                                {i18n.language === 'ar' ? '🛡️ 100% Original Parts' : '🛡️ 100% Original Parts'}
                                            </span>
                                        </div>
                                    </div>
                                    <p className="text-3xl font-black mb-1">{specResult.make} {specResult.model} {specResult.year}</p>
                                    <div className="flex items-center gap-2 opacity-90 font-bold">
                                        <Fuel className="h-4 w-4" />
                                        <span>{specResult.engineType}</span>
                                    </div>
                                </div>
                            </div>

                            {/* CVT/DCT Warning Banner */}
                            {(specResult.transmissionFluidType?.toUpperCase().includes('CVT') ||
                                specResult.transmissionFluidType?.toUpperCase().includes('DCT') ||
                                specResult.engineType?.toUpperCase().includes('CVT') ||
                                specResult.engineType?.toUpperCase().includes('DCT')) && (
                                    <div className="bg-amber-50 border-y border-amber-100 px-8 py-3 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-700">
                                        <div className="bg-amber-100 p-2 rounded-lg">
                                            <Info className="h-4 w-4 text-amber-600" />
                                        </div>
                                        <p className="text-[11px] font-bold text-amber-900 leading-snug">
                                            {i18n.language === 'ar'
                                                ? "تنبيه: تتطلب ناقلات الحركة من نوع CVT/DCT سوائل متخصصة جداً. يرجى التأكد من اختيار السائل المطابق للكود المذكور تماماً."
                                                : "ATTENTION: CVT/DCT transmissions require highly specialized fluids. Ensure you pick the fluid matching the specified code exactly."}
                                        </p>
                                    </div>
                                )}

                            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Motor Oil */}
                                <div className="bg-gray-50 rounded-2xl p-6 relative group overflow-hidden border border-transparent hover:border-[#28B463]/20 transition-colors">
                                    <div className="absolute top-4 right-4 text-[#28B463]/20 group-hover:text-[#28B463]/40 transition-colors">
                                        <Droplets className="h-12 w-12" />
                                    </div>
                                    <h3 className="text-sm font-black text-gray-500 uppercase tracking-widest mb-6 relative z-10">{t('motorOil')}</h3>
                                    <div className="space-y-6 relative z-10">
                                        <div>
                                            <p className="text-[10px] font-black text-gray-400 uppercase mb-1">{t('viscosity')}</p>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <p className="text-2xl font-black text-gray-900 leading-none">
                                                    {specResult.motorOilViscosity.split('(')[0].trim()}
                                                </p>
                                                {specResult.motorOilViscosity.includes('(') && (
                                                    <span className="bg-blue-600 text-white text-[10px] font-black px-2 py-1 rounded-md shadow-sm animate-pulse">
                                                        {specResult.motorOilViscosity.match(/\(([^)]+)\)/)?.[1] || ''}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[9px] font-bold text-gray-400 mt-1 italic">
                                                {i18n.language === 'ar' ? "* التزم بالمواصفات الأوروبية المذكورة" : "* Strictly follow the mentioned European specs"}
                                            </p>
                                        </div>

                                        <div>
                                            <p className="text-[10px] font-black text-gray-400 uppercase mb-1">{t('capacity')}</p>
                                            <p className="text-xl font-bold text-gray-700">{specResult.motorOilCapacity} L</p>
                                        </div>

                                        {/* Enhanced Smart Shopping List */}
                                        {smartSuggestion && (
                                            <div className="mt-2 p-5 bg-white rounded-2xl border border-[#28B463]/20 shadow-sm">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <ShoppingBag className="h-4 w-4 text-[#28B463]" />
                                                    <p className="text-[10px] font-black text-[#28B463] uppercase tracking-wider">{t('smartShoppingList')}</p>
                                                </div>
                                                <div className="space-y-3">
                                                    {smartSuggestion.jugs4l > 0 && (
                                                        <div className="flex items-center justify-between bg-gray-50 p-2 rounded-xl border border-gray-100">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-10 bg-[#28B463] rounded-lg flex items-center justify-center text-white text-[10px] font-black shadow-inner">4L</div>
                                                                <span className="text-xs font-black text-gray-700">{t('jug4l')}</span>
                                                            </div>
                                                            <span className="text-lg font-black text-[#28B463]">x{smartSuggestion.jugs4l}</span>
                                                        </div>
                                                    )}
                                                    {smartSuggestion.bottles1l > 0 && (
                                                        <div className="flex items-center justify-between bg-gray-50 p-2 rounded-xl border border-gray-100">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-6 h-8 bg-[#28B463]/70 rounded-md flex items-center justify-center text-white text-[8px] font-black shadow-inner">1L</div>
                                                                <span className="text-xs font-black text-gray-700">{t('bottle1l')}</span>
                                                            </div>
                                                            <span className="text-lg font-black text-[#28B463]">x{smartSuggestion.bottles1l}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Transmission */}
                                <div className="bg-gray-50 rounded-2xl p-6 relative group overflow-hidden border border-transparent hover:border-gray-200 transition-colors text-gray-900">
                                    <div className="absolute top-4 right-4 text-gray-100 group-hover:text-gray-200 transition-colors">
                                        <Settings className="h-12 w-12" />
                                    </div>
                                    <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-6 relative z-10">{t('transmission')}</h3>
                                    <div className="space-y-4 relative z-10 font-black">
                                        <div>
                                            <p className="text-[10px] font-black text-gray-400 uppercase mb-1">{t('fluidType')}</p>
                                            <p className="text-xl font-black text-gray-900">{specResult.transmissionFluidType}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-gray-400 uppercase mb-1">{t('capacity')}</p>
                                            <p className="text-xl font-bold text-gray-700">{specResult.transmissionCapacity} L</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-8 pt-0">
                                <button
                                    onClick={handleShopProducts}
                                    className="w-full flex items-center justify-center gap-3 bg-[#28B463] hover:bg-red-700 text-white py-5 rounded-2xl font-black text-lg transition-all active:scale-95 shadow-[0_20px_40px_-15px_rgba(220,38,38,0.3)] group"
                                >
                                    <ShoppingBag className="h-6 w-6 group-hover:bounce" />
                                    {t('shopSuitable')}
                                    <ChevronRight className={`h-5 w-5 transition-transform ${i18n.language === 'ar' ? 'rotate-180 group-hover:-translate-x-1' : 'group-hover:translate-x-1'}`} />
                                </button>
                            </div>
                        </div>

                        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 flex items-start gap-4">
                            <Info className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
                            <p className="text-sm font-bold text-blue-900 leading-relaxed">
                                {i18n.language === 'ar'
                                    ? "المعلومات أعلاه مقدمة كدليل فقط. يرجى دائماً مراجعة كتيب مالك السيارة للتأكد من المواصفات الدقيقة لسيارتك قبل الشراء."
                                    : "The information provided above is for guidance only. Please always refer to your vehicle's owner manual to confirm exact specifications before purchasing."}
                            </p>
                        </div>
                    </div>
                ) : selectedYear ? (
                    <div className="bg-orange-50 border border-orange-100 rounded-3xl p-12 text-center">
                        <Car className="h-12 w-12 text-orange-400 mx-auto mb-4" />
                        <h3 className="text-xl font-black text-orange-900 mb-2">{t('unknownVehicle')}</h3>
                        <p className="text-orange-700 font-bold mb-8">{t('contactUsDesc')}</p>

                        <a
                            href="https://wa.me/201234567890" // Placeholder WhatsApp
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-3 bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-2xl font-black transition-all active:scale-95 shadow-lg group"
                        >
                            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.417-.003 6.557-5.338 11.892-11.893 11.892-1.997-.001-3.951-.5-5.688-1.448l-6.305 1.652zm6.3-1.985l.363.216c1.52.905 3.284 1.383 5.09 1.384 5.4 0 9.794-4.394 9.796-9.794 0-2.615-1.018-5.074-2.866-6.923-1.848-1.848-4.307-2.866-6.924-2.867-5.4 0-9.795 4.394-9.798 9.795 0 2.035.63 4.02 1.815 5.727l.237.341-1.01 3.688 3.778-.99h.334-.02zM17.387 14.16c-.322-.161-1.905-.94-2.203-1.049-.297-.11-.514-.165-.73.165-.216.33-.836 1.049-1.025 1.264-.19.215-.378.243-.7.082-.322-.161-1.357-.5-2.585-1.594-.955-.853-1.6-1.907-1.787-2.23-.19-.323-.02-.497.141-.657.145-.145.322-.378.483-.566.161-.188.215-.323.322-.538.107-.215.054-.404-.027-.565-.08-.161-.73-1.762-1.0-2.41-.263-.637-.53-.55-.73-.56l-.623-.012c-.215 0-.565.08-.86.404-.297.323-1.135 1.11-1.135 2.708s1.16 3.148 1.321 3.364c.161.216 2.284 3.488 5.534 4.893.773.334 1.376.533 1.846.683.776.247 1.482.212 2.04.13.623-.092 1.905-.778 2.175-1.528.272-.75.272-1.393.19-1.528-.08-.135-.297-.215-.62-.376z" />
                            </svg>
                            {t('contactSupport')}
                        </a>
                    </div>
                ) : (
                    <div className="bg-gray-50/50 backdrop-blur-sm border border-gray-100 rounded-3xl p-8 text-center mt-12">
                        <p className="text-gray-400 font-bold mb-4">{t('unknownVehicle')}</p>
                        <button
                            onClick={() => window.open('https://wa.me/201234567890', '_blank')}
                            className="text-[#28B463] font-black text-sm border-b-2 border-[#28B463] hover:text-[#28B463] hover:border-red-700 transition-colors"
                        >
                            {t('contactSupport')}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default OilAdvisor;
