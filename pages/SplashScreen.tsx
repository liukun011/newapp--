import React from 'react';

const SplashScreen: React.FC = () => {
  const basePath = import.meta.env.BASE_URL || '/';
  
  return (
    <div 
      className="flex flex-col items-center justify-center min-h-screen relative overflow-hidden"
      style={{
        backgroundImage: `url(${basePath}assets/homebegin.png)`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div className="flex flex-col items-center justify-center">
        {/* Logo and Title */}
        <div className="text-center mb-4 animate-fadeIn z-10">
          <h1 className="text-5xl font-medium text-[#8b641d] mb-6">
            小狸报告
          </h1>
          <div className="text-xl text-[#8b641d] font-medium">
            更高效率、更多自由
          </div>
        </div>

        {/* Mascot Image */}
        <div className="relative z-10 flex items-center justify-center">
          <img 
            src={`${basePath}assets/homebeginimg.png`}
            alt="小狸吉祥物" 
            className="object-contain animate-fadeIn"
            style={{ width: '450px', height: '450px', animationDelay: '0.2s' }}
          />
        </div>

        {/* Loading indicator */}
        <div className="mt-8 flex gap-2 z-10">
          <div className="w-2 h-2 rounded-full bg-[#c99a3a] animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 rounded-full bg-[#c99a3a] animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 rounded-full bg-[#c99a3a] animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
