import { FeatureRail } from './public/FeatureRail';
import { HeroShowcase } from './public/HeroShowcase';
import { ProofStrip } from './public/ProofStrip';

export function PublicLanding() {
  return (
    <section>
      <div id="hero">
        <HeroShowcase />
      </div>
      <div id="proof">
        <ProofStrip />
      </div>
      <div id="features">
        <FeatureRail />
      </div>
    </section>
  );
}
