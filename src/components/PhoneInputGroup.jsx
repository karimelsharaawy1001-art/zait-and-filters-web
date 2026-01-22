import React from 'react';
import { useTranslation } from 'react-i18next';

const PhoneInputGroup = ({
    value,
    onChange,
    placeholder = '010XXXXXXXX',
    required = false,
    name = 'phone',
    error = false,
    label = null
}) => {
    const { t } = useTranslation();

    const handleDigitsOnly = (e) => {
        const val = e.target.value.replace(/\D/g, ''); // Remove non-numeric
        if (val.length <= 11) {
            onChange({ target: { name, value: val } });
        }
    };

    return (
        <div className="w-full">
            <label className="block text-xs font-black text-black uppercase tracking-widest mb-2">
                {label || t('auth.phone')}
            </label>
            <div className="relative flex w-full direction-ltr" dir="ltr">
                {/* Fixed Prefix */}
                <div className="flex items-center justify-center bg-gray-50 border-2 border-r-0 border-gray-100 rounded-l-xl px-4 text-black font-black text-sm select-none">
                    +2
                </div>

                {/* Main Input */}
                <div className="relative flex-1">
                    <input
                        type="tel"
                        name={name}
                        value={value}
                        onChange={handleDigitsOnly}
                        required={required}
                        placeholder={placeholder}
                        className={`w-full pl-4 pr-4 py-4 bg-gray-50 border-2 border-l-0 ${error ? 'border-red-500' : 'border-gray-100'} rounded-r-xl focus:border-orange-500 focus:outline-none transition-all font-bold text-black placeholder-[#666666] text-sm`}
                    />
                </div>
            </div>
        </div>
    );
};

export default PhoneInputGroup;
