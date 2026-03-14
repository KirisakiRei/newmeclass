// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const ProductSlider = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [itemsPerView, setItemsPerView] = useState(4);

  const defaultProducts = [
    {
      id: 1,
      title: "NEWME TEST",
      subtitle: "Tes Kepribadian 5 Element",
      image: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173w=400&q=80",
      link: "/newme-test",
      badge: "Popular"
    },
    {
      id: 2,
      title: "KELAS GALI BAKAT",
      subtitle: "Program Pengembangan Potensi",
      image: "https://images.unsplash.com/photo-1524178232363-1fb2b075b655w=400&q=80",
      link: "/kelas-gali-bakat",
      badge: "B to B"
    },
    {
      id: 3,
      title: "NEWME CLINIC",
      subtitle: "Konseling Individual",
      image: "https://images.unsplash.com/photo-1573497620053-ea5300f94f21w=400&q=80",
      link: "/services/clinic",
      badge: "B to C"
    },
    {
      id: 4,
      title: "NEWME CLASS",
      subtitle: "Pelatihan & Workshop",
      image: "https://images.unsplash.com/photo-1552664730-d307ca884978w=400&q=80",
      link: "/services/class",
      badge: "B to B"
    },
    {
      id: 5,
      title: "MERCHANDISE",
      subtitle: "Produk Komunitas NMC",
      image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30w=400&q=80",
      link: "/shop",
      badge: "New"
    },
    {
      id: 6,
      title: "Digital Apps",
      subtitle: "Aplikasi Tes Online",
      image: "https://images.unsplash.com/photo-1551650975-87deedd944c3w=400&q=80",
      link: "/user-test",
      badge: "Digital"
    }
  ];

  const [products, setProducts] = useState(defaultProducts);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const res = await axios.get(`${BACKEND_URL}/api/website-content/products`);
        if (res.data && res.data.length > 0) {
          const mapped = res.data
            .filter(p => p.isActive !== false)
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
            .map(p => ({
              id: p._id,
              title: p.title,
              subtitle: p.subtitle,
              image: p.imageUrl,
              link: p.link || '/',
              badge: p.badge || '',
            }));
          if (mapped.length > 0) setProducts(mapped);
        }
      } catch (err) {
        // fallback to defaults
      }
    };
    loadProducts();
  }, []);

  // Responsive items per view
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) {
        setItemsPerView(1);
      } else if (window.innerWidth < 768) {
        setItemsPerView(2);
      } else if (window.innerWidth < 1024) {
        setItemsPerView(3);
      } else {
        setItemsPerView(4);
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const maxIndex = Math.max(0, products.length - itemsPerView);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
    }, 4000);
    return () => clearInterval(interval);
  }, [maxIndex]);

  useEffect(() => {
    if (currentIndex > maxIndex) {
      setCurrentIndex(maxIndex);
    }
  }, [maxIndex, currentIndex]);

  const nextSlide = () => setCurrentIndex((prev) => Math.min(prev + 1, maxIndex));
  const prevSlide = () => setCurrentIndex((prev) => Math.max(prev - 1, 0));

  const slideWidth = 100 / itemsPerView;

  return (
    <section className="py-12 sm:py-16 md:py-20 bg-[#D4A017]" data-testid="product-slider-section">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-full border-2 border-[#1a1a1a] bg-white/20 backdrop-blur-sm mb-4">
            <svg viewBox="0 0 50 50" className="w-6 h-6 sm:w-10 sm:h-10 text-[#1a1a1a]">
              <path fill="currentColor" d="M25 5 L35 15 L35 25 L25 35 L15 25 L15 15 Z M20 18 Q25 12 30 18 Q35 24 25 30 Q15 24 20 18"/>
            </svg>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1a1a1a] mb-2">
            PRODUK USAHA
          </h2>
          <p className="text-[#1a1a1a]/80 text-sm sm:text-base">NIB: 2805240064989</p>
        </div>

        {/* Slider Container */}
        <div className="relative px-8 sm:px-12">
          <div className="overflow-hidden">
            <div 
              className="flex transition-transform duration-500 ease-out"
              style={{ transform: `translateX(-${currentIndex * slideWidth}%)` }}
            >
              {products.map((product) => (
                <Link
                  key={product.id}
                  to={product.link}
                  className="flex-shrink-0 px-2 group"
                  style={{ width: `${slideWidth}%` }}
                  data-testid={`product-card-${product.id}`}
                >
                  <div className="bg-white/90 rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 group-hover:scale-[1.02]">
                    <div className="relative aspect-square">
                      <img 
                        src={product.image} 
                        alt={product.title}
                        className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                      />
                      {product.badge && (
                        <span className="absolute top-2 right-2 sm:top-3 sm:right-3 bg-[#1a1a1a] text-white text-[10px] sm:text-xs px-2 sm:px-3 py-1 rounded-full">
                          {product.badge}
                        </span>
                      )}
                    </div>
                    <div className="p-3 sm:p-4 text-center">
                      <h3 className="font-bold text-[#1a1a1a] group-hover:text-[#D4A017] transition-colors text-sm sm:text-base">
                        {product.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-600 mt-1">{product.subtitle}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Navigation Buttons */}
          <button 
            onClick={prevSlide}
            disabled={currentIndex === 0}
            className="absolute left-0 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-[#1a1a1a] hover:bg-[#2a2a2a] text-white rounded-full flex items-center justify-center transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            data-testid="product-prev"
          >
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
          </button>
          <button 
            onClick={nextSlide}
            disabled={currentIndex >= maxIndex}
            className="absolute right-0 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-[#1a1a1a] hover:bg-[#2a2a2a] text-white rounded-full flex items-center justify-center transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            data-testid="product-next"
          >
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
          </button>
        </div>

        {/* Dots */}
        <div className="flex justify-center gap-2 mt-6 sm:mt-8">
          {Array.from({ length: maxIndex + 1 }).map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`transition-all duration-300 rounded-full ${
                index === currentIndex ?
                   'w-6 sm:w-8 h-2 sm:h-3 bg-[#1a1a1a]' 
                  : 'w-2 sm:w-3 h-2 sm:h-3 bg-[#1a1a1a]/30 hover:bg-[#1a1a1a]/50'
              }`}
              data-testid={`product-dot-${index}`}
            />
          ))}
        </div>

        {/* Bottom Text */}
        <p className="text-center text-[#1a1a1a]/70 text-xs sm:text-sm mt-6 sm:mt-8 italic px-4">
          ( dan kolaborasi dengan industri yang relatif di bisnis komunitas )
        </p>
      </div>
    </section>
  );
};

export default ProductSlider;
