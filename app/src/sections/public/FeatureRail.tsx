import { Compass, Film, Layers3, Sparkles, Video } from 'lucide-react';

const features = [
  {
    icon: Compass,
    title: 'Idea Capture',
    text: 'Start from typed or recorded concept and shape an initial direction quickly.',
  },
  {
    icon: Layers3,
    title: 'Beat Story Engine',
    text: 'Turn rough notes into timed beats with structure and continuity-aware flow.',
  },
  {
    icon: Sparkles,
    title: 'Scene Storyboards',
    text: 'Generate visual scene packages with style controls and director prompts.',
  },
  {
    icon: Video,
    title: 'Async Scene Video',
    text: 'Render scene clips in the background with per-shot control and status tracking.',
  },
  {
    icon: Film,
    title: 'Final Film Compile',
    text: 'Collage completed clips into one final film ready for review and download.',
  },
];

export function FeatureRail() {
  return (
    <section className="bg-[#010101]">
      <div className="max-w-[1200px] mx-auto px-4 py-14 md:py-20">
        <div className="mb-8">
          <p className="text-[11px] uppercase tracking-[0.22em] text-cyan-300/80">Platform Overview</p>
          <h2 className="font-hero-sans font-extrabold text-3xl md:text-4xl text-white mt-2">One pipeline, full cinematic workflow.</h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map(item => (
            <article key={item.title} className="rounded-xl border border-gray-800 bg-gradient-to-b from-[#07131f]/55 to-black/40 p-4">
              <p className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-cyan-400/30 bg-cyan-500/10 text-cyan-200 mb-3">
                <item.icon className="w-4 h-4" />
              </p>
              <h3 className="text-sm font-semibold text-white">{item.title}</h3>
              <p className="text-xs text-gray-400 mt-2 leading-relaxed">{item.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
