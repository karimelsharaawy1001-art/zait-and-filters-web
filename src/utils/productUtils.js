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

/**
 * Formats warranty duration based on months.
 * 
 * @param {number|string} months - Duration in months.
 * @param {string} lang - Language code ('ar' or 'en').
 * @returns {string} - Formatted warranty string.
 */
export const formatWarranty = (months, lang = 'ar', includePrefix = true) => {
    const num = parseInt(months);
    if (!num || isNaN(num)) return months || '';

    // Robust language check for Arabic
    const isAr = lang && lang.toLowerCase().startsWith('ar');

    // Special cases: 1 Year / 2 Years
    if (num === 12) {
        if (!includePrefix) return isAr ? 'سنة واحدة' : '1 Year';
        return isAr ? 'ضمان سنة' : '1 Year Warranty';
    }

    if (num === 24) {
        if (!includePrefix) return isAr ? 'سنتين' : '2 Years';
        return isAr ? 'ضمان سنتين' : '2 Years Warranty';
    }

    // Default case with units
    if (isAr) {
        // Arabic pluralization: 3-10 are 'شهور', 11+ or 1-2 are 'شهر'
        const suffix = (num >= 3 && num <= 10) ? 'شهور' : 'شهر';
        return includePrefix ? `ضمان ${num} ${suffix}` : `${num} ${suffix}`;
    }

    // English pluralization
    const suffix = num === 1 ? 'Month' : 'Months';
    return includePrefix ? `${num} ${suffix} Warranty` : `${num} ${suffix}`;
};
