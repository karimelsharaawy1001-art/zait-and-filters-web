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

/**
 * Parses a year range string into numeric start and end years.
 * Examples: "2004-2013" -> { yearStart: 2004, yearEnd: 2013 }
 *           "2010" -> { yearStart: 2010, yearEnd: 2010 }
 * 
 * @param {string|number} range - The year range string or number.
 * @returns {Object} - { yearStart: number|null, yearEnd: number|null }
 */
export const parseYearRange = (range) => {
    if (!range) return { yearStart: null, yearEnd: null };

    const str = String(range).trim();
    if (!str) return { yearStart: null, yearEnd: null };

    // Handle range with separator (-, /, to, etc)
    const parts = str.split(/[-/]| to /i).map(p => parseInt(p.trim()));

    if (parts.length === 2) {
        const [start, end] = parts;
        return {
            yearStart: isNaN(start) ? null : start,
            yearEnd: isNaN(end) ? null : end
        };
    }

    if (parts.length === 1) {
        const year = parseInt(parts[0]);
        return {
            yearStart: isNaN(year) ? null : year,
            yearEnd: isNaN(year) ? null : year
        };
    }

    return { yearStart: null, yearEnd: null };
};

/**
 * Normalizes Arabic text for consistent searching.
 * Replaces variations of Alef, Yae, and Teh Marbuta.
 * 
 * @param {string} text - The string to normalize.
 * @returns {string} - Normalized string.
 */
export const normalizeArabic = (text) => {
    if (!text) return '';
    return String(text)
        .replace(/[أإآ]/g, 'ا')
        .replace(/ة/g, 'ه')
        .replace(/ى/g, 'ي')
        .replace(/[\u064B-\u0652]/g, '') // Remove Harakat (vowels)
        .toLowerCase()
        .trim();
};
