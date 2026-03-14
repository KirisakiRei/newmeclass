// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Star, Quote } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const TestimonialSlider = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  const defaultTestimonials = [
    {
      id: 1,
      name: "Siti Rahma",
      organization: "Yayasan Al Karim",
      role: "Kepala Sekolah",
      image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330w=200&q=80",
      rating: 5,
      text: "Program event KELAS GALI BAKAT yang telah terealisir di sekolah kami, NYATA telah memberi ANTUSIAS yang tinggi dari murid-murid kami. Semoga NEWMECLASS semakin mampu memberi efek superlitas dan kualitas murid kami kini dan kedepan."
    },
    {
      id: 2,
      name: "Asmi Kamal",
      organization: "Peserta Program",
      role: "Mahasiswa",
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2dw=200&q=80",
      rating: 5,
      text: "Setelah diobservasi oleh NEWMECLASS, semakin mengerti tentang 'siapa diri ini', memastikan langkah apa yang bisa saya pilih dalam pengembangan."
    },
    {
      id: 3,
      name: "Dr. Ahmad Fauzi",
      organization: "Universitas Negeri Medan",
      role: "Dosen Psikologi",
      image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4ew=200&q=80",
      rating: 5,
      text: "Metode 5 Element yang digunakan NEWMECLASS sangat komprehensif dan berbasis riset. Saya merekomendasikan program ini untuk mahasiswa dan profesional."
    },
    {
      id: 4,
      name: "Rina Susanti",
      organization: "PT. Global Mandiri",
      role: "HR Manager",
      image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80w=200&q=80",
      rating: 5,
      text: "Kami telah bermitra dengan NEWMECLASS untuk program pengembangan karyawan. Hasilnya sangat positif, produktivitas tim meningkat dan kepuasan kerja lebih baik."
    }
  ];

  const [testimonials, setTestimonials] = useState(defaultTestimonials);

  useEffect(() => {
    const loadTestimonials = async () => {
      try {
        const res = await axios.get(`${BACKEND_URL}/api/website-content/testimonials`);
        if (res.data && res.data.length > 0) {
          const mapped = res.data
            .filter(t => t.isActive !== false)
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
            .map(t => ({
              id: t._id,
              name: t.name,
              organization: t.organization,
              role: t.role,
              image: t.imageUrl,
              rating: t.rating || 5,
              text: t.text,
            }));
          if (mapped.length > 0) setTestimonials(mapped);
        }
      } catch (err) {
        // fallback to defaults
      }
    };
    loadTestimonials();
  }, []);

  useEffect(() => {
    if (!isAutoPlaying) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [isAutoPlaying, testimonials.length]);

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % testimonials.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + testimonials.length) % testimonials.length);

  return (
    <section 
      className="py-12 sm:py-16 md:py-20 bg-[#111111] relative overflow-hidden"
      onMouseEnter={() => setIsAutoPlaying(false)}
      onMouseLeave={() => setIsAutoPlaying(true)}
      data-testid="testimonial-section"
    >
      {/* Decorative Background - Hidden on mobile */}
      <div className="hidden sm:block absolute top-10 right-10 opacity-10">
        <Quote className="w-24 sm:w-32 md:w-40 h-24 sm:h-32 md:h-40 text-[#D4A017]" />
      </div>

      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-full border-2 border-[#D4A017] bg-white/10 backdrop-blur-sm mb-4">
            <svg viewBox="0 0 50 50" className="w-6 h-6 sm:w-10 sm:h-10 text-[#D4A017]">
              <path fill="currentColor" d="M25 5 L35 15 L35 25 L25 35 L15 25 L15 15 Z M20 18 Q25 12 30 18 Q35 24 25 30 Q15 24 20 18"/>
            </svg>
          </div>
          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-2">
            <span className="text-[#D4A017]">TANGGAPAN</span> MITRA & KLIEN
          </h2>
          <div className="flex items-center justify-center gap-1 mb-4">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-4 h-4 sm:w-5 sm:h-5 fill-[#D4A017] text-[#D4A017]" />
            ))}
          </div>
          <p className="text-gray-300 text-xs sm:text-sm">Diwakili Oleh:</p>
        </div>

        {/* Slider */}
        <div className="relative">
          {testimonials.map((testimonial, index) => {
            const isActive = index === currentSlide;
            return (
              <div
                key={testimonial.id}
                className={`transition-all duration-700 ${
                  isActive ? 'opacity-100 relative' : 'opacity-0 absolute inset-0 pointer-events-none'
                }`}
              >
                <div className="flex flex-col md:grid md:grid-cols-2 gap-6 md:gap-8 items-center">
                  {/* Testimonial Card */}
                  <div className="bg-[#D4A017] rounded-2xl p-4 sm:p-6 md:p-8 relative w-full">
                    <Quote className="absolute top-2 left-2 sm:top-4 sm:left-4 w-6 h-6 sm:w-8 sm:h-8 text-[#1a1a1a]/20" />
                    <div className="relative z-10">
                      <h3 className="text-[#1a1a1a] font-bold text-sm sm:text-base md:text-lg mb-1">{testimonial.name} / {testimonial.organization}</h3>
                      <p className="text-[#1a1a1a]/80 italic leading-relaxed text-xs sm:text-sm md:text-base">
                        {testimonial.text}
                      </p>
                    </div>
                  </div>

                  {/* Image */}
                  <div className="flex justify-center">
                    <div className="relative">
                      <div className="w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 lg:w-64 lg:h-64 rounded-full overflow-hidden border-4 border-[#D4A017] shadow-2xl">
                        <img 
                          src={testimonial.image} 
                          alt={testimonial.name}
                          className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-500"
                        />
                      </div>
                      {/* Name Badge */}
                      <div className="absolute -bottom-3 sm:-bottom-4 left-1/2 -translate-x-1/2 bg-white px-3 sm:px-4 py-1 sm:py-2 rounded-full shadow-lg">
                        <p className="text-[#1a1a1a] font-semibold text-xs sm:text-sm whitespace-nowrap">{testimonial.role}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Navigation */}
          <div className="flex justify-center gap-3 sm:gap-4 mt-6 sm:mt-8">
            <button 
              onClick={prevSlide}
              className="w-10 h-10 sm:w-12 sm:h-12 bg-white/10 hover:bg-[#D4A017] text-white hover:text-black rounded-full flex items-center justify-center transition-all duration-300 border border-[#D4A017]/50"
              data-testid="testimonial-prev"
            >
              <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
            
            <div className="flex items-center gap-2">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`transition-all duration-300 rounded-full ${
                    index === currentSlide ?
                       'w-6 sm:w-8 h-2 sm:h-3 bg-[#D4A017]' 
                      : 'w-2 sm:w-3 h-2 sm:h-3 bg-white/50 hover:bg-white/70'
                  }`}
                  data-testid={`testimonial-dot-${index}`}
                />
              ))}
            </div>

            <button 
              onClick={nextSlide}
              className="w-10 h-10 sm:w-12 sm:h-12 bg-white/10 hover:bg-[#D4A017] text-white hover:text-black rounded-full flex items-center justify-center transition-all duration-300 border border-[#D4A017]/50"
              data-testid="testimonial-next"
            >
              <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TestimonialSlider;
