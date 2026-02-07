import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ChevronDown } from 'lucide-react';

export function Hero() {
  const heroRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const scrollIndicatorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Title animation - character flip
      if (titleRef.current) {
        const chars = titleRef.current.querySelectorAll('.char');
        gsap.fromTo(chars, 
          { rotateX: 90, opacity: 0, transformOrigin: 'center bottom' },
          { 
            rotateX: 0, 
            opacity: 1, 
            duration: 1.2, 
            stagger: 0.03,
            ease: 'back.out(1.7)',
            delay: 0.5
          }
        );
      }

      // Subtitle animation
      gsap.fromTo(subtitleRef.current,
        { y: 50, opacity: 0 },
        { y: 0, opacity: 1, duration: 1, ease: 'power3.out', delay: 0.8 }
      );

      // Scroll indicator
      gsap.fromTo(scrollIndicatorRef.current,
        { scale: 0, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.8, ease: 'elastic.out(1, 0.5)', delay: 1.2 }
      );
    }, heroRef);

    return () => ctx.revert();
  }, []);

  // Split title into characters
  const title = "THE RISE OF AFROBEATS IN SEATTLE";
  const titleChars = title.split('').map((char, i) => (
    <span key={i} className="char inline-block" style={{ display: char === ' ' ? 'inline' : 'inline-block' }}>
      {char === ' ' ? '\u00A0' : char}
    </span>
  ));

  return (
    <section 
      ref={heroRef}
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
    >
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img 
          src="https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1920&q=80"
          alt="Concert crowd"
          className="w-full h-full object-cover"
        />
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/90" />
        {/* Vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,transparent_50%,rgba(0,0,0,0.6)_100%)]" />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-4 max-w-5xl mx-auto">
        {/* Tagline */}
        <p className="font-script text-3xl md:text-4xl text-[#D0FF59] mb-4 opacity-0 animate-[fadeIn_1s_ease_0.3s_forwards]">
          A Documentary Journey
        </p>

        {/* Main Title */}
        <h1 
          ref={titleRef}
          className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-white mb-6 leading-tight"
          style={{ perspective: '1000px' }}
        >
          {titleChars}
        </h1>

        {/* Subtitle */}
        <p 
          ref={subtitleRef}
          className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto mb-12 opacity-0"
        >
          Explore the vibrant journey of Afrobeats music and culture in the Emerald City, 
          from 2010 to today. Click on any year to add your own story.
        </p>

        {/* CTA Button */}
        <button 
          onClick={() => document.getElementById('timeline')?.scrollIntoView({ behavior: 'smooth' })}
          className="group relative px-8 py-4 bg-[#D0FF59] text-black font-semibold rounded-full overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-[0_0_40px_rgba(208,255,89,0.5)]"
        >
          <span className="relative z-10">Explore the Timeline</span>
          <div className="absolute inset-0 bg-white transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
        </button>
      </div>

      {/* Scroll Indicator */}
      <div 
        ref={scrollIndicatorRef}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 opacity-0"
      >
        <div className="flex flex-col items-center text-white/60">
          <span className="text-sm mb-2">Scroll to explore</span>
          <ChevronDown className="w-6 h-6 animate-bounce-scroll" />
        </div>
      </div>
    </section>
  );
}
