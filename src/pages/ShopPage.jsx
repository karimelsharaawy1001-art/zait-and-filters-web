import { useFilters } from '../context/FilterContext';
import { useSafeNavigation } from '../utils/safeNavigation';

const ShopPage = () => {
    const { searchParams, setSearchParams } = useSafeNavigation();
    const { filters, updateFilter } = useFilters();
    const { t } = useTranslation();

    // Sync URL to State (Initial Load / Back Button)
    useEffect(() => {
        const make = searchParams.get('make') || '';
        const model = searchParams.get('model') || '';
        const year = searchParams.get('year') || '';
        const category = searchParams.get('category') || 'All';
        const subcategory = searchParams.get('subcategory') || '';
        const viscosity = searchParams.get('viscosity') || '';
        const page = parseInt(searchParams.get('page')) || 1;
        const brand = searchParams.get('brand') || '';
        const origin = searchParams.get('origin') || '';

        if (make !== filters.make) updateFilter('make', make);
        if (model !== filters.model) updateFilter('model', model);
        if (year !== filters.year) updateFilter('year', year);
        if (category !== filters.category) updateFilter('category', category);
        if (subcategory !== filters.subcategory) updateFilter('subcategory', subcategory);
        if (viscosity !== filters.viscosity) updateFilter('viscosity', viscosity);
        if (brand !== filters.brand) updateFilter('brand', brand);
        if (origin !== filters.origin) updateFilter('origin', origin);
        if (page !== filters.page) updateFilter('page', page);
    }, [searchParams]);

    // Sync State to URL (When User Filters via UI)
    useEffect(() => {
        const params = new URLSearchParams();
        if (filters.make) params.set('make', filters.make);
        if (filters.model) params.set('model', filters.model);
        if (filters.year) params.set('year', filters.year);
        if (filters.category && filters.category !== 'All') params.set('category', filters.category);
        if (filters.subcategory) params.set('subcategory', filters.subcategory);
        if (filters.viscosity) params.set('viscosity', filters.viscosity);
        if (filters.brand) params.set('brand', filters.brand);
        if (filters.origin) params.set('origin', filters.origin);
        if (filters.page && filters.page > 1) params.set('page', filters.page);

        const newSearchString = params.toString();
        const currentSearchString = searchParams.toString();

        // Only update if the URL actually needs to change
        if (newSearchString !== currentSearchString) {
            console.log('[ShopPage] Updating URL params (Safe Replace mode)');
            setSearchParams(params, { replace: true });
        }
    }, [filters, searchParams, setSearchParams]);

    return (
        <div className="pt-4 md:pt-8 text-right">
            <SEO
                title={`${t('shopTitle')} | Zait & Filters`}
                description={t('shopSubtitle')}
                url={window.location.origin + window.location.pathname}
            />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <Breadcrumbs />
            </div>
            <div className="bg-white shadow-sm border-b border-gray-100 py-4 md:py-8 mb-2 md:mb-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h1 className="text-3xl font-extrabold text-gray-900">{t('shopTitle')}</h1>
                    <p className="mt-2 text-gray-500">{t('shopSubtitle')}</p>
                </div>
            </div>
            <ProductGrid showFilters={true} />
        </div>
    );
};

export default ShopPage;
