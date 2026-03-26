import { HeroCarousel } from "../../app/components/HeroCarousel";
import { AboutSection } from "../../app/components/AboutSection";
import { ServicesSection } from "../../app/components/ServicesSection";
import { PromoSection } from "../../app/components/PromoSection";
import { ProductSlider } from "../../app/components/ProductSlider";
import { TestimonialSlider } from "../../app/components/TestimonialSlider";
import { BenefitsSection } from "../../app/components/BenefitsSection";
import { ActivitiesSection } from "../../app/components/ActivitiesSection";
import { ArticlesSection } from "../../app/components/ArticlesSection";
import { VisiMisiSection } from "../../app/components/VisiMisiSection";
import { BannerSlider } from "../../app/components/BannerSlider";
import { FinalCTA } from "../../app/components/FinalCTA";

export function Home() {
  return (
    <>
      <HeroCarousel />
      <AboutSection />
      <ServicesSection />
      <PromoSection />
      <ProductSlider />
      <TestimonialSlider />
      <BenefitsSection />
      <ActivitiesSection />
      <ArticlesSection />
      <VisiMisiSection />
      <BannerSlider />
      <FinalCTA />
    </>
  );
}
