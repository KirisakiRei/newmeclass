import { HeroCarousel } from "./HeroCarousel";
import { AboutSection } from "./AboutSection";
import { ServicesSection } from "./ServicesSection";
import { PromoSection } from "./PromoSection";
import { ProductSlider } from "./ProductSlider";
import { TestimonialSlider } from "./TestimonialSlider";
import { BenefitsSection } from "./BenefitsSection";
import { ActivitiesSection } from "./ActivitiesSection";
import { ArticlesSection } from "./ArticlesSection";
import { VisiMisiSection } from "./VisiMisiSection";
import { BannerSlider } from "./BannerSlider";
import { FinalCTA } from "./FinalCTA";

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
