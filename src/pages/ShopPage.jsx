import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import ProductGrid from '../components/ProductGrid';
import { useFilters } from '../context/FilterContext';

const ShopPage = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const { filters, updateFilter } = useFilters();

    // Sync URL to State (Initial Load / Back Button)
    useEffect(() => {
        const make = searchParams.get('make');
        const model = searchParams.get('model');
        const year = searchParams.get('year');
        const category = searchParams.get('category');
        const viscosity = searchParams.get('viscosity');

        if (make && make !== filters.make) updateFilter('make', make);
        if (model && model !== filters.model) updateFilter('model', model);
        if (year && year !== filters.year) updateFilter('year', year);
        if (category && category !== filters.category) updateFilter('category', category);
        if (viscosity && viscosity !== filters.viscosity) updateFilter('viscosity', viscosity);
    }, [searchParams]);

    // Sync State to URL (When User Filters via UI)
    useEffect(() => {
        const params = new URLSearchParams();
        if (filters.make) params.set('make', filters.make);
        if (filters.model) params.set('model', filters.model);
        if (filters.year) params.set('year', filters.year);
        if (filters.category && filters.category !== 'All') params.set('category', filters.category);
        if (filters.viscosity) params.set('viscosity', filters.viscosity);

        setSearchParams(params);
    }, [filters, setSearchParams]);

    return (
        <div className="pt-8">
            <div className="bg-white shadow-sm border-b border-gray-100 py-8 mb-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h1 className="text-3xl font-extrabold text-gray-900">Shop All Parts</h1>
                    <p className="mt-2 text-gray-500">Browse our complete inventory of premium auto parts.</p>
                </div>
            </div>
            <ProductGrid showFilters={true} />
        </div>
    );
};

export default ShopPage;
