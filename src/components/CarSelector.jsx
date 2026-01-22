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

const years = Array.from({ length: 2026 - 2000 + 1 }, (_, i) => 2026 - i); // 2026 down to 2000

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
                    <label className="block text-[11px] text-gray-400 mb-2 ml-1 mr-1 font-black uppercase tracking-widest leading-none">{t('make')}</label>
                    <div className="relative">
                        <select
                            className="w-full bg-white/5 border border-white/10 text-white py-4 px-5 pr-10 rounded-xl focus:outline-none focus:bg-white/10 focus:border-[#e31e24] focus:ring-1 focus:ring-[#e31e24] transition-all appearance-none font-bold text-sm backdrop-blur-sm"
                            value={make}
                            onChange={(e) => setMake(e.target.value)}
                        >
                            <option value="" className="bg-[#111111] text-white">{t('selectMake')}</option>
                            {Object.keys(carData).map(m => (
                                <option key={m} value={m} className="bg-[#111111] text-white">{m}</option>
                            ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                        </div>
                    </div>
                </div>

                {/* Model */}
                <div className="relative">
                    <label className="block text-[11px] text-gray-400 mb-2 ml-1 mr-1 font-black uppercase tracking-widest leading-none">{t('model')}</label>
                    <div className="relative">
                        <select
                            className={`w-full bg-white/5 border border-white/10 text-white py-4 px-5 pr-10 rounded-xl focus:outline-none focus:bg-white/10 focus:border-[#e31e24] focus:ring-1 focus:ring-[#e31e24] transition-all appearance-none font-bold text-sm backdrop-blur-sm ${!make ? 'opacity-30 cursor-not-allowed' : ''}`}
                            value={model}
                            onChange={(e) => setModel(e.target.value)}
                            disabled={!make}
                        >
                            <option value="" className="bg-[#111111] text-white">{t('selectModel')}</option>
                            {make && carData[make].map(m => (
                                <option key={m} value={m} className="bg-[#111111] text-white">{m}</option>
                            ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                        </div>
                    </div>
                </div>

                {/* Year */}
                <div className="relative">
                    <label className="block text-[11px] text-gray-400 mb-2 ml-1 mr-1 font-black uppercase tracking-widest leading-none">{t('year')}</label>
                    <div className="relative">
                        <select
                            className="w-full bg-white/5 border border-white/10 text-white py-4 px-5 pr-10 rounded-xl focus:outline-none focus:bg-white/10 focus:border-[#e31e24] focus:ring-1 focus:ring-[#e31e24] transition-all appearance-none font-bold text-sm backdrop-blur-sm"
                            value={year}
                            onChange={(e) => setYear(e.target.value)}
                        >
                            <option value="" className="bg-[#111111] text-white">{t('allYears')}</option>
                            {years.map(y => (
                                <option key={y} value={y} className="bg-[#111111] text-white">{y}</option>
                            ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                        </div>
                    </div>
                </div>

                {/* Search Button */}
                <div className="pt-4">
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
