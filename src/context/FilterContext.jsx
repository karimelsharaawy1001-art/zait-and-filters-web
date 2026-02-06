import React, { createContext, useState, useContext, useEffect } from 'react';
import { databases } from '../appwrite';
import { Query } from 'appwrite';
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

    const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
    const USERS_COLLECTION = import.meta.env.VITE_APPWRITE_USERS_COLLECTION_ID;

    // Sync Garage Data from Appwrite
    useEffect(() => {
        const syncGarage = async () => {
            if (user && DATABASE_ID && USERS_COLLECTION) {
                try {
                    const response = await databases.listDocuments(
                        DATABASE_ID,
                        USERS_COLLECTION,
                        [Query.equal('userId', user.$id)]
                    );

                    if (response.total > 0) {
                        const userData = response.documents[0];
                        const garage = userData.garage || [];
                        setUserGarage(garage);

                        const active = garage.find(c => c.isActive) || garage[0] || null;
                        setActiveCar(active);

                        if (garage.length === 0) {
                            setIsGarageFilterActive(false);
                        }
                    }
                } catch (error) {
                    console.error('Error fetching garage from Appwrite:', error);
                }
            } else {
                setUserGarage([]);
                setActiveCar(null);
                setIsGarageFilterActive(false);
            }
        };

        syncGarage();
    }, [user, DATABASE_ID, USERS_COLLECTION]);


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
