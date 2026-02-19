const proofItems = [
  'Idea -> Beat Story -> Storyboard -> Video -> Final Film',
  'Built for creators, agencies, and studio teams',
  'Async rendering with clear progress and continuity checks',
];

export function ProofStrip() {
  return (
    <section className="border-b border-gray-900 bg-[#04070d]">
      <div className="max-w-[1200px] mx-auto px-4 py-4 grid md:grid-cols-3 gap-2 md:gap-4">
        {proofItems.map(item => (
          <div key={item} className="rounded-lg border border-gray-800 bg-black/30 px-3 py-2 text-xs text-gray-300">
            {item}
          </div>
        ))}
      </div>
    </section>
  );
}
