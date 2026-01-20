import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { useFilters } from '../context/FilterContext';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const carData = {
    Toyota: ['Corolla', 'Yaris', 'Camry', 'Fortuner'],
    Nissan: ['Sunny', 'Sentra', 'Qashqai', 'Patrol'],
    Hyundai: ['Elantra', 'Tucson', 'Accent', 'Santa Fe'],
    Kia: ['Cerato', 'Sportage', 'Picanto', 'Sorento'],
    Mercedes: ['C180', 'E200', 'S500', 'G-Class'],
    BMW: ['320i', '520i', 'X3', 'X5']
};

const years = Array.from({ length: 15 }, (_, i) => 2024 - i); // 2010 to 2024

const CarSelector = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [make, setMake] = useState('');
    const [model, setModel] = useState('');
    const [year, setYear] = useState('');

    // Reset model when make changes
    useEffect(() => {
        setModel('');
    }, [make]);

    const handleSearch = () => {
        const params = new URLSearchParams();
        if (make) params.append('make', make);
        if (model) params.append('model', model);
        if (year) params.append('year', year);

        navigate(`/shop?${params.toString()}`);
    };

    return (
        <div className="bg-white/90 backdrop-blur-md p-6 rounded-xl shadow-2xl w-full border border-white/20">
            <h3 className="text-gray-900 font-bold mb-6 flex items-center text-lg">
                <span className="bg-orange-600 w-2 h-6 mr-3 ml-3 rounded-full"></span>
                {t('selectVehicle')}
            </h3>

            <div className="grid grid-cols-1 gap-5">
                {/* Make */}
                <div className="relative">
                    <label className="block text-xs text-gray-500 mb-1 ml-1 mr-1 font-bold uppercase tracking-wide">{t('make')}</label>
                    <div className="relative">
                        <select
                            className="w-full bg-gray-50/50 border border-gray-300 text-gray-800 py-3 px-4 pr-8 rounded-lg leading-tight focus:outline-none focus:bg-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all appearance-none font-medium"
                            value={make}
                            onChange={(e) => setMake(e.target.value)}
                        >
                            <option value="">{t('selectMake')}</option>
                            {Object.keys(carData).map(m => (
                                <option key={m} value={m}>{m}</option>
                            ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                        </div>
                    </div>
                </div>

                {/* Model */}
                <div className="relative">
                    <label className="block text-xs text-gray-500 mb-1 ml-1 mr-1 font-bold uppercase tracking-wide">{t('model')}</label>
                    <div className="relative">
                        <select
                            className={`w-full bg-gray-50/50 border border-gray-300 text-gray-800 py-3 px-4 pr-8 rounded-lg leading-tight focus:outline-none focus:bg-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all appearance-none font-medium ${!make ? 'opacity-50 cursor-not-allowed' : ''}`}
                            value={model}
                            onChange={(e) => setModel(e.target.value)}
                            disabled={!make}
                        >
                            <option value="">{t('selectModel')}</option>
                            {make && carData[make].map(m => (
                                <option key={m} value={m}>{m}</option>
                            ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                        </div>
                    </div>
                </div>

                {/* Year */}
                <div className="relative">
                    <label className="block text-xs text-gray-500 mb-1 ml-1 mr-1 font-bold uppercase tracking-wide">{t('year')}</label>
                    <div className="relative">
                        <select
                            className="w-full bg-gray-50/50 border border-gray-300 text-gray-800 py-3 px-4 pr-8 rounded-lg leading-tight focus:outline-none focus:bg-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all appearance-none font-medium"
                            value={year}
                            onChange={(e) => setYear(e.target.value)}
                        >
                            <option value="">{t('allYears')}</option>
                            {years.map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                        </div>
                    </div>
                </div>

                {/* Search Button */}
                <div className="pt-2">
                    <button
                        onClick={handleSearch}
                        className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-4 px-4 rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-orange-500/30 transform hover:-translate-y-0.5"
                    >
                        <Search className="h-5 w-5" />
                        {t('shopNow')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CarSelector;
