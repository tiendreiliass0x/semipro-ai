import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import heroVideo from '@/assets/kling-page1-v2-1-265.mp4';
import heroPoster from '@/assets/hero-poster.svg';

const openAuth = (mode: 'login' | 'register') => {
  window.dispatchEvent(new CustomEvent('yenengalabs:open-auth', { detail: { mode } }));
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
        <div className="mt-auto pb-4 md:pb-12 xl:pb-14">
          <div className="max-w-[92vw] md:max-w-none rounded-xl md:rounded-2xl xl:rounded-3xl backdrop-blur-0 md:backdrop-blur-[2px] p-3 md:p-6 xl:p-8">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5 md:gap-8 xl:gap-12">
              <div className="max-w-2xl xl:max-w-3xl">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/30 bg-black/35 px-2.5 py-1">
                  <img src="/yenengalabs-logo.png" alt="YenengaLabs logo" className="w-6 h-6 rounded object-cover" />
                  <span className="text-[11px] uppercase tracking-widest text-white/85">YenengaLabs</span>
                </div>
                <h1 className="font-hero-sans text-3xl sm:text-6xl lg:text-7xl xl:text-8xl leading-[0.98] text-white drop-shadow-[0_6px_25px_rgba(0,0,0,0.55)]">
                  YenengaLabs
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
