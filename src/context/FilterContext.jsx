import React, { createContext, useState, useContext, useEffect } from 'react';
import { db } from '../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useAuth } from './AuthContext';

const FilterContext = createContext();

export const useFilters = () => useContext(FilterContext);

export const FilterProvider = ({ children }) => {
    const { user } = useAuth();
    const [filters, setFilters] = useState({
        make: '',
        model: '',
        year: '',
        category: 'All',
        subcategory: '',
        searchQuery: '',
        viscosity: '',
        brand: '',
        origin: '',
        page: 1
    });

    const [isGarageFilterActive, setIsGarageFilterActive] = useState(false);
    const [activeCar, setActiveCar] = useState(null);
    const [userGarage, setUserGarage] = useState([]);

    // Sync Garage Data from Firestore
    useEffect(() => {
        const syncGarage = async () => {
            if (user) {
                try {
                    const userDocRef = doc(db, 'users', user.uid);
                    const userSnap = await getDoc(userDocRef);

                    if (userSnap.exists()) {
                        const userData = userSnap.data();
                        const garage = userData.garage || [];
                        setUserGarage(garage);

                        // Auto-select active car
                        const active = garage.find(c => c.isActive) || garage[0] || null;
                        setActiveCar(active);

                        if (garage.length === 0) {
                            setIsGarageFilterActive(false);
                        }
                    }
                } catch (error) {
                    console.error('Error fetching garage from Firestore:', error);
                }
            } else {
                setUserGarage([]);
                setActiveCar(null);
                setIsGarageFilterActive(false);
            }
        };

        syncGarage();
    }, [user]);

    const updateFilter = (key, value) => {
        setFilters(prev => {
            let newPage = 1;
            if (key === 'page') {
                const parsed = parseInt(value);
                newPage = isNaN(parsed) ? (prev.page || 1) : Math.max(1, parsed);
            }

            return {
                ...prev,
                [key]: value,
                page: newPage
            };
        });
    };

    const resetFilters = () => {
        setFilters({
            make: '',
            model: '',
            year: '',
            category: 'All',
            subcategory: '',
            searchQuery: '',
            viscosity: '',
            brand: '',
            origin: '',
            page: 1
        });
    };

    const toggleGarageFilter = () => {
        if (!activeCar) return false;
        setIsGarageFilterActive(prev => !prev);
        return true;
    };

    return (
        <FilterContext.Provider value={{
            filters,
            updateFilter,
            resetFilters,
            isGarageFilterActive,
            setIsGarageFilterActive,
            activeCar,
            setActiveCar,
            userGarage,
            toggleGarageFilter
        }}>
            {children}
        </FilterContext.Provider>
    );
};
