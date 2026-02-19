import { FeatureRail } from './public/FeatureRail';
import { HeroShowcase } from './public/HeroShowcase';
import { ProofStrip } from './public/ProofStrip';

export function PublicLanding() {
  return (
    <section>
      <HeroShowcase />
      <ProofStrip />
      <FeatureRail />
    </section>
  );
}
