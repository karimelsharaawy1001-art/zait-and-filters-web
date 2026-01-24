/**
 * Generates a standard product description based on product attributes.
 * Formula: [Product Name] + [Car Make] + [Model] + [Year] + [Part Brand] + [Origin]
 * 
 * @param {Object} product - The product data object.
 * @param {string} lang - The language code ('ar' or 'en').
 * @returns {string} - The generated description.
 */
export const generateProductDescription = (product, lang = 'ar') => {
    if (!product) return '';

    const isAr = lang === 'ar';

    // 1. Product Name
    const name = isAr ? product.name : (product.nameEn || product.name);

    // 2. Car Make
    const make = product.make || '';

    // 3. Model
    const model = product.model || '';

    // 4. Year
    let year = '';
    if (product.yearRange) {
        year = product.yearRange;
    } else if (product.yearStart || product.yearEnd) {
        year = `${product.yearStart || ''}${product.yearStart && product.yearEnd ? '-' : ''}${product.yearEnd || ''}`;
    }

    // 5. Part Brand
    const brand = isAr
        ? (product.partBrand || product.brand || '')
        : (product.brandEn || product.partBrand || product.brand || '');

    // 6. Origin
    const origin = isAr
        ? (product.countryOfOrigin || '')
        : (product.origin || product.countryOfOrigin || '');

    // Combine parts
    const parts = [name, make, model, year, brand, origin].filter(part => part && part.toString().trim() !== '');

    return parts.join(' ').trim();
};
