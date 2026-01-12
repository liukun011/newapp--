import React, { useEffect, useState } from 'react';
import { COLORS } from '../constants';

const SoundWave: React.FC<{ isRecording: boolean }> = ({ isRecording }) => {
  const [bars, setBars] = useState<number[]>(Array(30).fill(10));

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isRecording) {
      interval = setInterval(() => {
        setBars(prev => prev.map(() => Math.floor(Math.random() * 30) + 10));
      }, 150);
    } else {
      setBars(Array(30).fill(4));
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  return (
    <div className="flex items-center justify-center h-20 w-full gap-[3px] overflow-hidden px-4">
      {bars.map((height, index) => (
        <div
          key={index}
          className="w-[4px] rounded-full transition-all duration-150 ease-in-out"
          style={{
            height: `${height}px`,
            backgroundColor: COLORS.primary,
            opacity: 0.6 + (height / 80), // Taller bars are more opaque
          }}
        />
      ))}
    </div>
  );
};

export default SoundWave;