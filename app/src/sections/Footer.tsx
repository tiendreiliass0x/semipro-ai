import { Instagram, Twitter, Youtube } from 'lucide-react';
import { SubscribeForm } from '@/components/SubscribeForm';

export function Footer() {
  return (
    <footer className="relative py-20 px-4 border-t border-gray-800">
      <div className="max-w-4xl mx-auto">
        {/* Logo */}
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl md:text-4xl text-white mb-2">
            AFROBEATS SEATTLE
          </h2>
          <p className="font-script text-2xl text-[#D0FF59]">
            The Documentary
          </p>
        </div>

        {/* Newsletter */}
        <div className="glass rounded-2xl p-8 mb-12">
          <h3 className="text-xl font-semibold text-white text-center mb-2">
            Stay Updated
          </h3>
          <p className="text-gray-400 text-center mb-6">
            Get notified when the documentary premieres
          </p>

          <SubscribeForm />
        </div>

        {/* Social Links */}
        <div className="flex justify-center gap-6 mb-12">
          <a 
            href="#" 
            className="p-3 bg-gray-800 rounded-full hover:bg-[#D0FF59] hover:text-black transition-all duration-300 group"
          >
            <Instagram className="w-5 h-5 text-gray-400 group-hover:text-black" />
          </a>
          <a 
            href="#" 
            className="p-3 bg-gray-800 rounded-full hover:bg-[#D0FF59] hover:text-black transition-all duration-300 group"
          >
            <Twitter className="w-5 h-5 text-gray-400 group-hover:text-black" />
          </a>
          <a 
            href="#" 
            className="p-3 bg-gray-800 rounded-full hover:bg-[#D0FF59] hover:text-black transition-all duration-300 group"
          >
            <Youtube className="w-5 h-5 text-gray-400 group-hover:text-black" />
          </a>
        </div>

        {/* Links */}
        <div className="flex flex-wrap justify-center gap-8 mb-8">
          <a href="#" className="text-gray-400 hover:text-white transition-colors">
            Privacy Policy
          </a>
          <a href="#" className="text-gray-400 hover:text-white transition-colors">
            Terms of Use
          </a>
          <a href="#" className="text-gray-400 hover:text-white transition-colors">
            Contact
          </a>
          <a href="#" className="text-gray-400 hover:text-white transition-colors">
            Press Kit
          </a>
        </div>

        {/* Copyright */}
        <div className="text-center text-gray-600 text-sm">
          <p>&copy; {new Date().getFullYear()} Afrobeats Seattle Documentary. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
