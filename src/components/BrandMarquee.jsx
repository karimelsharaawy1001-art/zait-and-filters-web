import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';

const BrandMarquee = () => {
    const [brands, setBrands] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBrands = async () => {
            try {
                const snapshot = await getDocs(collection(db, 'brands'));
                const brandsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setBrands(brandsList);
            } catch (error) {
                console.error("Error fetching brand logos from Firebase:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchBrands();
    }, []);

    if (brands.length === 0) return null;

    // Dynamic Repeat Logic:
    // We repeat brands enough times to ensure the track is definitely wider than any screen.
    // Small sets (e.g. 3 logos) need more repeats than large sets (e.g. 20 logos).
    const repeats = brands.length < 5 ? 6 : 3;
    const displayBrands = Array(repeats).fill(brands).flat();
    const movePercentage = (100 / repeats);

    return (
        <div className="brands-marquee-wrapper">
            <div className="brands-marquee-track">
                {displayBrands.map((brand, idx) => (
                    <div key={`${brand.id}-${idx}`} className="brands-marquee-item">
                        <img
                            src={brand.logo || brand.imageUrl}
                            alt={brand.name}
                            className="brands-marquee-img"
                            loading="lazy"
                        />
                    </div>
                ))}
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                .brands-marquee-wrapper {
                    width: 100%;
                    overflow: hidden;
                    background: #ffffff;
                    padding: 15px 0;
                    border-bottom: 2px solid #f1f5f9;
                    position: relative;
                    /* CRITICAL FIX: Force LTR to prevent RTL-based centering/jumping */
                    direction: ltr !important; 
                }

                .brands-marquee-track {
                    display: flex;
                    width: max-content;
                    animation: marquee-forever 45s linear infinite;
                    will-change: transform;
                    /* Ensure it starts from the extreme left regardless of page settings */
                    justify-content: flex-start !important; 
                }

                .brands-marquee-item {
                    flex-shrink: 0;
                    padding: 0 60px; /* Increased gap */
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 250px; /* Increased stabilization width */
                }

                .brands-marquee-img {
                    height: 80px; /* Increased height */
                    width: auto;
                    object-fit: contain;
                    filter: grayscale(100%);
                    opacity: 0.5;
                    transition: all 0.4s ease;
                }

                .brands-marquee-item:hover .brands-marquee-img {
                    filter: grayscale(0%);
                    opacity: 1;
                    transform: scale(1.15);
                }

                .brands-marquee-wrapper:hover .brands-marquee-track {
                    animation-play-state: paused;
                }

                @keyframes marquee-forever {
                    0% {
                        transform: translate3d(0, 0, 0);
                    }
                    100% {
                        /* We move by EXACTLY one full set of brands */
                        transform: translate3d(-${movePercentage}%, 0, 0);
                    }
                }

                /* Mobile Friendly */
                @media (max-width: 768px) {
                    .brands-marquee-item {
                        padding: 0 30px;
                        width: 180px;
                    }
                    .brands-marquee-img {
                        height: 50px;
                    }
                    .brands-marquee-track {
                        animation-duration: 30s;
                    }
                }
            `}} />
        </div>
    );
};

export default BrandMarquee;
