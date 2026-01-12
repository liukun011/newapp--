import React from 'react';
import { MASCOT_IMAGE_URL } from '../constants';

const Mascot: React.FC<{ size?: 'small' | 'medium' | 'large' }> = ({ size = 'medium' }) => {
  let sizeClass = "w-40 h-40";
  if (size === 'small') sizeClass = "w-16 h-16";
  if (size === 'large') sizeClass = "w-64 h-64";

  return (
    <div className={`relative ${sizeClass} mx-auto flex items-center justify-center`}>
      {/* Glow effect behind mascot */}
      <div className="absolute inset-0 bg-blue-400/20 blur-3xl rounded-full scale-110"></div>
      
      <img 
        src={MASCOT_IMAGE_URL} 
        alt="Little Fox Mascot" 
        className="relative z-10 object-cover w-full h-full rounded-2xl drop-shadow-2xl hover:scale-105 transition-transform duration-500"
        style={{
          maskImage: 'linear-gradient(to bottom, black 80%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, black 80%, transparent 100%)'
        }}
      />
      
      {/* Floating Elements (Decorative) */}
      <div className="absolute -top-2 -right-4 text-2xl animate-bounce" style={{ animationDelay: '0.2s' }}>✨</div>
      <div className="absolute top-10 -left-6 text-xl animate-bounce" style={{ animationDelay: '0.7s' }}>🎵</div>
    </div>
  );
};

export default Mascot;