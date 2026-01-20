import React from 'react';
import { Phone } from 'lucide-react';

const PhoneInputGroup = ({
    value,
    onChange,
    placeholder = '10XXXXXXXX',
    required = false,
    name = 'phone',
    error = false,
    label = 'Phone Number'
}) => {
    const handleDigitsOnly = (e) => {
        const val = e.target.value.replace(/\D/g, ''); // Remove non-numeric
        if (val.length <= 11) {
            onChange({ target: { name, value: val } });
        }
    };

    return (
        <div className="space-y-2">
            {label && (
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                    {label}
                </label>
            )}
            <div className="relative flex">
                {/* Fixed Prefix */}
                <div className="flex items-center justify-center bg-gray-100 border-2 border-r-0 border-gray-100 px-4 rounded-l-xl text-gray-500 font-black text-sm select-none">
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
                        className={`w-full pl-4 pr-4 py-4 bg-gray-50 border-2 border-l-0 ${error ? 'border-red-500' : 'border-gray-100'} rounded-r-xl focus:border-orange-500 focus:outline-none transition-all font-bold placeholder-gray-300 text-sm`}
                    />
                </div>
            </div>
        </div>
    );
};

export default PhoneInputGroup;
