import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { useFilters } from '../context/FilterContext';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';

// Dictionary for smart redirects based on car selection
// Key: "Make Model", Value: Viscosity (string) or full URL (starts with http)
const oilLinks = {
    "Toyota Corolla": "5W-30",
    "Nissan Sunny": "10W-40",
    "Hyundai Tuscon": "5W-30",
    "Mitsubishi Lancer": "10W-40",
    // Add more mappings here. Example:
    // "Mercedes C180": "https://zaitandfilters.com/product/mercedes-service-kit"
};

const CarSelector = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(false);
    const [make, setMake] = useState('');
    const [model, setModel] = useState('');
    const [year, setYear] = useState('');

    const [makes, setMakes] = useState([]);
    const [models, setModels] = useState([]);
    const [availableYears, setAvailableYears] = useState([]);
    const [noResults, setNoResults] = useState(false);
    const [carsData, setCarsData] = useState([]);

    // Fetch ALL cars from Firestore on mount
    useEffect(() => {
        const fetchCars = async () => {
            console.log('[CarSelector] Starting to fetch cars...');
            setLoading(true);
            try {
                const querySnapshot = await getDocs(collection(db, 'cars'));
                console.log('[CarSelector] Query complete. Docs:', querySnapshot.docs.length);

                const cars = querySnapshot.docs.map(doc => doc.data());
                console.log('[CarSelector] Cars loaded:', cars);
                setCarsData(cars);

                // Extract unique makes
                const uniqueMakes = [...new Set(cars.map(c => c.make))].filter(Boolean).sort();
                console.log('[CarSelector] Unique makes:', uniqueMakes);
                setMakes(uniqueMakes);

                if (uniqueMakes.length === 0) {
                    console.warn('[CarSelector] No makes found! Check cars collection.');
                }
            } catch (error) {
                console.error("[CarSelector] Error fetching cars:", error);
                setMakes([]);
            } finally {
                setLoading(false);
            }
        };
        fetchCars();
    }, []);

    // Update models when make changes
    useEffect(() => {
        if (!make) {
            setModels([]);
            setModel('');
            setAvailableYears([]);
            setYear('');
            setNoResults(false);
            return;
        }

        // Filter models for selected make
        const filteredCars = carsData.filter(car => car.make === make);
        const uniqueModels = [...new Set(filteredCars.map(c => c.model))].filter(Boolean).sort();

        setModels(uniqueModels);
        setModel('');
        setAvailableYears([]);
        setYear('');
        setNoResults(uniqueModels.length === 0);
    }, [make, carsData]);

    // Update years when model changes
    useEffect(() => {
        if (!make || !model) {
            setAvailableYears([]);
            setYear('');
            return;
        }

        // Find the car entry for this make/model
        const carEntry = carsData.find(car => car.make === make && car.model === model);

        if (carEntry && carEntry.yearStart && carEntry.yearEnd) {
            // Generate year range
            const years = [];
            for (let y = Number(carEntry.yearStart); y <= Number(carEntry.yearEnd); y++) {
                years.push(y);
            }
            setAvailableYears(years.sort((a, b) => b - a));
            setNoResults(years.length === 0);
        } else {
            setAvailableYears([]);
            setNoResults(true);
        }
        setYear('');
    }, [make, model, carsData]);

    const handleSearch = () => {
        if (!make && !model && !year) {
            navigate('/shop');
            return;
        }

        const vehicleKey = `${make} ${model}`;
        const oilLink = oilLinks[vehicleKey];

        // 1. Smart Redirect Logic (Legacy/Extras)
        if (oilLink) {
            if (oilLink.startsWith('http')) {
                window.location.href = oilLink;
                return;
            } else {
                navigate(`/shop?viscosity=${encodeURIComponent(oilLink)}`);
                return;
            }
        }

        // 2. Default Shop Redirect with Filters
        const params = new URLSearchParams();
        if (make) params.append('make', make);
        if (model) params.append('model', model);
        if (year) params.append('year', year);

        navigate(`/shop?${params.toString()}`);
    };

    return (
        <div className="bg-[#111111] p-8 rounded-2xl shadow-2xl w-full border border-white/5 relative overflow-hidden group">
            {/* Subtle Texture Overlay */}
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_right,#e31e24,transparent)]"></div>

            <h3 className="text-white font-black mb-8 flex items-center text-2xl uppercase italic tracking-tighter relative z-10">
                <span className="bg-[#e31e24] w-3 h-8 mr-4 ml-4 rounded-sm transform -skew-x-12"></span>
                {t('selectVehicle')}
            </h3>

            <div className="grid grid-cols-1 gap-6 relative z-10">
                {/* Make */}
                <div className="relative">
                    <label className="block text-[11px] text-gray-400 mb-2 ml-1 mr-1 font-black uppercase tracking-widest leading-none">
                        {t('make')}
                    </label>
                    <div className="relative">
                        <select
                            className="w-full bg-white/5 border border-white/10 text-white py-4 px-5 pr-10 rounded-xl focus:outline-none focus:bg-white/10 focus:border-[#e31e24] focus:ring-1 focus:ring-[#e31e24] transition-all appearance-none font-bold text-sm backdrop-blur-sm"
                            value={make}
                            onChange={(e) => setMake(e.target.value)}
                            disabled={loading && (makes || []).length === 0}
                        >
                            <option value="" className="bg-[#111111] text-white">
                                {loading && (makes || []).length === 0 ? 'Loading...' : t('selectMake')}
                            </option>
                            {Array.isArray(makes) && makes.map(m => (
                                <option key={m} value={m} className="bg-[#111111] text-white">{m}</option>
                            ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                            {loading && (makes || []).length === 0 ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                            )}
                        </div>
                    </div>
                </div>

                {/* Model */}
                <div className="relative">
                    <label className="block text-[11px] text-gray-400 mb-2 ml-1 mr-1 font-black uppercase tracking-widest leading-none">{t('model')}</label>
                    <div className="relative">
                        <select
                            className={`w-full bg-white/5 border border-white/10 text-white py-4 px-5 pr-10 rounded-xl focus:outline-none focus:bg-white/10 focus:border-[#e31e24] focus:ring-1 focus:ring-[#e31e24] transition-all appearance-none font-bold text-sm backdrop-blur-sm ${!make || (loading && (models || []).length === 0) ? 'opacity-30 cursor-not-allowed' : ''}`}
                            value={model}
                            onChange={(e) => setModel(e.target.value)}
                            disabled={!make || (loading && (models || []).length === 0)}
                        >
                            <option value="" className="bg-[#111111] text-white">
                                {loading && make && (models || []).length === 0 ? 'Loading...' : t('selectModel')}
                            </option>
                            {Array.isArray(models) && models.map(m => (
                                <option key={m} value={m} className="bg-[#111111] text-white">{m}</option>
                            ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                            {loading && make && (models || []).length === 0 ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                            )}
                        </div>
                    </div>
                </div>

                {/* Year */}
                <div className="relative">
                    <label className="block text-[11px] text-gray-400 mb-2 ml-1 mr-1 font-black uppercase tracking-widest leading-none">{t('year')}</label>
                    <div className="relative">
                        <select
                            className={`w-full bg-white/5 border border-white/10 text-white py-4 px-5 pr-10 rounded-xl focus:outline-none focus:bg-white/10 focus:border-[#e31e24] focus:ring-1 focus:ring-[#e31e24] transition-all appearance-none font-bold text-sm backdrop-blur-sm ${!model || (loading && availableYears.length === 0) ? 'opacity-30 cursor-not-allowed' : ''}`}
                            value={year}
                            onChange={(e) => setYear(e.target.value)}
                            disabled={!model || (loading && availableYears.length === 0)}
                        >
                            <option value="" className="bg-[#111111] text-white">
                                {loading && model && (availableYears || []).length === 0 ? 'Loading...' : t('allYears')}
                            </option>
                            {Array.isArray(availableYears) && availableYears.map(y => (
                                <option key={y} value={y} className="bg-[#111111] text-white">{y}</option>
                            ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                            {loading && model && (availableYears || []).length === 0 ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                            )}
                        </div>
                    </div>
                </div>

                {/* No Results Message */}
                {noResults && (
                    <div className="animate-in fade-in slide-in-from-top-1 duration-300">
                        <p className="text-[#e31e24] text-[12px] font-bold text-center bg-red-500/10 py-2 rounded-lg border border-red-500/20">
                            {t('noPartsForModel')}
                        </p>
                    </div>
                )}

                {/* Search Button */}
                <div className="pt-2">
                    <button
                        onClick={handleSearch}
                        className="w-full bg-[#e31e24] hover:bg-[#b8181d] text-white font-black py-5 px-6 rounded-xl shadow-2xl shadow-red-900/40 transition-all flex items-center justify-center gap-3 transform hover:-translate-y-1 active:scale-95 uppercase italic tracking-widest"
                    >
                        <Search className="h-6 w-6 not-italic" />
                        <span className="text-lg">{t('shopNow')}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CarSelector;
