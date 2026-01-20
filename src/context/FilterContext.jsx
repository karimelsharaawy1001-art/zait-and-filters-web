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
        subCategory: '',
        searchQuery: '',
        viscosity: ''
    });

    const [isGarageFilterActive, setIsGarageFilterActive] = useState(false);
    const [activeCar, setActiveCar] = useState(null);
    const [userGarage, setUserGarage] = useState([]);

    // Sync Garage Data from Firestore
    useEffect(() => {
        let unsubscribe = () => { };

        const syncGarage = async (user) => {
            if (user) {
                const userDocRef = doc(db, 'users', user.uid);
                unsubscribe = onSnapshot(userDocRef, (doc) => {
                    if (doc.exists()) {
                        const data = doc.data();
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
                });
            } else {
                setUserGarage([]);
                setActiveCar(null);
                setIsGarageFilterActive(false);
            }
        };

        const authUnsubscribe = auth.onAuthStateChanged(syncGarage);

        return () => {
            authUnsubscribe();
            unsubscribe();
        };
    }, []);

    const updateFilter = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const resetFilters = () => {
        setFilters({
            make: '',
            model: '',
            year: '',
            category: 'All',
            subCategory: '',
            searchQuery: '',
            viscosity: ''
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
