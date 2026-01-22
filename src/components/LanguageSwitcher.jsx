import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';

const LanguageSwitcher = () => {
    const { i18n } = useTranslation();

    const toggleLanguage = () => {
        const newLng = i18n.language === 'ar' ? 'en' : 'ar';
        i18n.changeLanguage(newLng);
    };

    useEffect(() => {
        const dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
        document.documentElement.dir = dir;
        document.documentElement.lang = i18n.language;

        // Update body font or other styles if needed
        if (i18n.language === 'ar') {
            document.body.style.fontFamily = "'Cairo', sans-serif";
        } else {
            document.body.style.fontFamily = "'Inter', sans-serif";
        }
    }, [i18n.language]);

    return (
        <button
            onClick={toggleLanguage}
            className="flex items-center justify-center gap-2 px-3 py-1.5 rounded-md border-[1px] border-[#000000] hover:border-[#e31e24] transition-all bg-white font-Cairo nav-link-black"
            title={i18n.language === 'ar' ? 'Switch to English' : 'تغيير للغة العربية'}
        >
            <div className="force-black">
                <Languages className="h-4 w-4 stroke-[3px] shrink-0" />
            </div>
            <span className="leading-none text-[14px]">
                {i18n.language === 'ar' ? 'English' : 'عربي'}
            </span>
        </button>
    );
};

export default LanguageSwitcher;
