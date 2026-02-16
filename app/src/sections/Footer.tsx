import { Disc3, Github, Globe2, Instagram, Twitter, Youtube } from 'lucide-react';

export function Footer() {
  return (
    <footer className="relative mt-24 py-20 px-4 border-t border-cyan-500/20 bg-gradient-to-b from-[#05080f] to-black">
      <div className="max-w-6xl mx-auto">
        <div className="text-center text-sm text-gray-400 mb-16">
          Craft your first polished short film with <span className="text-cyan-200">Semipro AI Director Studio</span>.
        </div>

        <div className="grid md:grid-cols-[1.4fr_1fr_1fr_1fr] gap-12">
          <div>
            <h2 className="font-display text-4xl text-white mb-3">SEMIPRO AI</h2>
            <p className="text-sm text-gray-400 max-w-sm">
              AI-first filmmaking workspace for directors, creators, and ambitious amateurs.
            </p>

            <div className="flex gap-3 mt-6">
              {[Twitter, Instagram, Disc3, Github, Globe2, Youtube].map((Icon, index) => (
                <a
                  key={index}
                  href="#"
                  className="w-10 h-10 rounded-full bg-gray-800/80 border border-gray-700 inline-flex items-center justify-center text-gray-300 hover:text-cyan-100 hover:border-cyan-400/40 hover:bg-cyan-500/10"
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <p className="text-white font-semibold mb-4">Product</p>
            <div className="space-y-3 text-gray-400 text-sm">
              <a href="#" className="block hover:text-white">Director Studio</a>
              <a href="#" className="block hover:text-white">Scenes Workspace</a>
              <a href="#" className="block hover:text-white">Video Studio</a>
              <a href="#" className="block hover:text-white">Pricing</a>
            </div>
          </div>

          <div>
            <p className="text-white font-semibold mb-4">Features</p>
            <div className="space-y-3 text-gray-400 text-sm">
              <a href="#" className="block hover:text-white">Synopsis Polish</a>
              <a href="#" className="block hover:text-white">Beat Story Capture</a>
              <a href="#" className="block hover:text-white">Storyboard Frames</a>
              <a href="#" className="block hover:text-white">Scene Video Queue</a>
            </div>
          </div>

          <div>
            <p className="text-white font-semibold mb-4">Company</p>
            <div className="space-y-3 text-gray-400 text-sm">
              <a href="#" className="block hover:text-white">About</a>
              <a href="#" className="block hover:text-white">Terms of Service</a>
              <a href="#" className="block hover:text-white">Privacy Policy</a>
              <a href="#" className="block hover:text-white">Contact</a>
            </div>
          </div>
        </div>

        <div className="mt-14 pt-6 border-t border-gray-800 text-sm text-gray-500 flex flex-wrap items-center justify-between gap-3">
          <p>&copy; {new Date().getFullYear()} Semipro AI. All rights reserved.</p>
          <p>Built for creative minds to ship fast</p>
        </div>
      </div>
    </footer>
  );
}
