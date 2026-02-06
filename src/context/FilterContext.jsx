import React, { createContext, useState, useContext, useEffect } from 'react';
import { auth, db } from '../firebase';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';

const FilterContext = createContext();

export const useFilters = () => useContext(FilterContext);

export const FilterProvider = ({ children }) => {
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
        // QUOTA SHIELD: Replaced onSnapshot with one-time fetch
        const syncGarage = async (user) => {
            if (user) {
                try {
                    const userDocRef = doc(db, 'users', user.uid);
                    const docSnap = await getDoc(userDocRef);
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        const garage = data.garage || [];
                        setUserGarage(garage);

                        // Set active car to the one marked as isActive, or the first one
                        const active = garage.find(c => c.isActive) || garage[0] || null;
                        setActiveCar(active);

                        // If no garage, ensure filter is off
                        if (garage.length === 0) {
                            setIsGarageFilterActive(false);
                        }
                    }
                } catch (error) {
                    console.error('Error fetching garage:', error);
                }
            } else {
                setUserGarage([]);
                setActiveCar(null);
                setIsGarageFilterActive(false);
            }
        };

        const authUnsubscribe = auth.onAuthStateChanged(syncGarage);

        return () => {
            authUnsubscribe();
        };
    }, []);


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
