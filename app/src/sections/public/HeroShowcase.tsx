import { useEffect, useState } from 'react';
import { ArrowRight, Clapperboard, PlayCircle } from 'lucide-react';
import heroVideo from '@/assets/kling-page1-v2-1-265.mp4';
import heroPoster from '@/assets/hero-poster.svg';

const openAuth = (mode: 'login' | 'register') => {
  window.dispatchEvent(new CustomEvent('semipro:open-auth', { detail: { mode } }));
};

export function HeroShowcase() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setPrefersReducedMotion(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  const showVideo = !prefersReducedMotion && !videoFailed;

  return (
    <section className="relative overflow-hidden border-b border-cyan-500/20 min-h-[70vh] md:min-h-[88vh]">
      {showVideo ? (
        <video
          className="absolute inset-0 w-full h-full object-contain md:object-cover bg-black"
          src={heroVideo}
          poster={heroPoster}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          onError={() => setVideoFailed(true)}
        />
      ) : (
        <img src={heroPoster} alt="" className="absolute inset-0 w-full h-full object-contain md:object-cover bg-black" loading="eager" />
      )}

      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,4,2,0.66)_0%,rgba(5,5,5,0.22)_40%,rgba(1,1,1,0.72)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(900px_360px_at_50%_50%,rgba(245,158,11,0.18),transparent_70%)]" />

      <div className="relative max-w-[1560px] mx-auto px-4 md:px-6 xl:px-10 min-h-[70vh] md:min-h-[88vh] flex flex-col">
        <header className="pt-5 md:pt-6 xl:pt-8">
          <nav className="rounded-full border border-white/20 bg-black/35 backdrop-blur-md px-4 md:px-6 xl:px-8 py-2.5 xl:py-3 flex items-center justify-between gap-4 xl:gap-8 text-white">
            <button className="inline-flex items-center gap-2 text-sm md:text-base xl:text-lg font-semibold tracking-wide">
              <Clapperboard className="w-4 h-4" /> Semipro AI
            </button>
            <div className="hidden md:flex items-center gap-8 xl:gap-12 text-sm xl:text-base text-white/85">
              <a href="#hero" className="hover:text-white transition">Home</a>
              <a href="#proof" className="hover:text-white transition">Proof</a>
              <a href="#features" className="hover:text-white transition">Features</a>
            </div>
            <div className="inline-flex items-center gap-2 xl:gap-3">
              <button
                onClick={() => openAuth('login')}
                className="px-4 xl:px-5 py-1.5 xl:py-2 rounded-full border border-white/45 text-xs md:text-sm xl:text-base text-white bg-white/5 hover:bg-white/10 transition"
              >
                Sign In
              </button>
              <button
                onClick={() => openAuth('register')}
                className="px-4 xl:px-5 py-1.5 xl:py-2 rounded-full bg-white text-black text-xs md:text-sm xl:text-base font-semibold hover:bg-white/90 transition"
              >
                Try Now
              </button>
            </div>
          </nav>
        </header>

        <div className="mt-auto pb-4 md:pb-12 xl:pb-14">
          <div className="max-w-[92vw] md:max-w-none rounded-xl md:rounded-2xl xl:rounded-3xl border border-white/15 bg-black/20 md:bg-black/28 backdrop-blur-0 md:backdrop-blur-[2px] p-3 md:p-6 xl:p-8">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5 md:gap-8 xl:gap-12">
              <div className="max-w-2xl xl:max-w-3xl">
                <h1 className="font-hero-sans text-3xl sm:text-6xl lg:text-7xl xl:text-8xl leading-[0.98] text-white drop-shadow-[0_6px_25px_rgba(0,0,0,0.55)]">
                  Semipro AI
                </h1>
                <p className="mt-1.5 md:mt-2 xl:mt-3 text-xs sm:text-base xl:text-lg text-gray-100/90 max-w-xl xl:max-w-2xl line-clamp-2 sm:line-clamp-none">
                  A filmmaker-first AI studio for turning story beats into cinematic scenes, polished clips, and a final cut.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 xl:gap-3 md:justify-end">
                <button
                  onClick={() => openAuth('register')}
                  className="inline-flex items-center gap-2 px-3.5 xl:px-5 py-1.5 xl:py-2.5 rounded-full bg-white text-black font-semibold text-xs sm:text-sm xl:text-base hover:bg-white/90 transition"
                >
                  Start Creating <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => openAuth('login')}
                  className="inline-flex items-center gap-2 px-3.5 xl:px-5 py-1.5 xl:py-2.5 rounded-full border border-white/55 text-white text-xs sm:text-sm xl:text-base bg-black/25 hover:bg-black/40 transition"
                >
                  <PlayCircle className="w-4 h-4" /> Sign In
                </button>
                <a href="#features" className="hidden sm:inline-flex items-center px-4 xl:px-5 py-2 xl:py-2.5 rounded-full border border-white/55 text-white text-sm xl:text-base bg-black/25 hover:bg-black/40 transition">
                  Explore Features
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
