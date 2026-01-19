import React, { useRef } from 'react';
import { motion, useAnimation } from 'framer-motion';

interface RecordingFloatBubbleProps {
    isRecording: boolean;
    seconds: number;
    onClick: () => void;
    appContainerRef: React.RefObject<HTMLDivElement>;
    initialX?: number; // Optional initial X offset
}

const RecordingFloatBubble: React.FC<RecordingFloatBubbleProps> = ({
    isRecording,
    seconds,
    onClick,
    appContainerRef,
    initialX = 0,
}) => {
    const bubbleRef = useRef<HTMLDivElement>(null);
    const bubbleControls = useAnimation();

    const formatTime = (totalSeconds: number) => {
        const hrs = Math.floor(totalSeconds / 3600);
        const mins = Math.floor((totalSeconds % 3600) / 60);
        const secs = totalSeconds % 60;
        if (hrs > 0) {
            return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Ensure the bubble enters correctly
    React.useEffect(() => {
        bubbleControls.start({ scale: 1, opacity: 1, x: initialX });
    }, [bubbleControls, initialX]);

    return (
        <motion.div
            ref={bubbleRef}
            drag
            dragConstraints={appContainerRef}
            dragMomentum={false}
            whileDrag={{ scale: 1.1 }}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={bubbleControls}
            exit={{ scale: 0.8, opacity: 0 }}
            onDragEnd={() => {
                // 吸附逻辑：松手时判断中心点位置，吸附到最近的屏幕边缘
                const winW = window.innerWidth;
                const rect = bubbleRef.current?.getBoundingClientRect();
                if (rect) {
                    const centerX = rect.left + rect.width / 2;
                    // 如果中心点在左半屏，吸附到左边；否则吸附到右边
                    if (centerX < winW / 2) {
                        // x 是相对于初始位置 (fixed right:16px) 的偏移
                        // 目标：Visual Left = 16px
                        // Initial Visual Left = WinW - 16px - RectW
                        // Visual Left = Initial + x => x = Visual Left - Initial
                        // x = 16 - (WinW - 16 - RectW) = 32 + RectW - WinW
                        bubbleControls.start({ x: 32 + rect.width - winW, transition: { type: 'spring', stiffness: 400, damping: 30 } });
                    } else {
                        // 目标：Visual Right = 16px => x = 0
                        bubbleControls.start({ x: 0, transition: { type: 'spring', stiffness: 400, damping: 30 } });
                    }
                }
            }}
            className="fixed right-4 top-[120px] z-50 touch-none cursor-move"
        >
            <button
                onClick={onClick}
                className="bg-white rounded-full pl-2 pr-4 py-2 shadow-lg flex items-center gap-2 border border-teal-50 active:scale-95 transition-transform"
            >
                <div className={`w-5 h-5 rounded-full border-[3px] flex items-center justify-center relative ${isRecording ? 'border-teal-400' : 'border-red-400'}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${isRecording ? 'bg-teal-500' : 'bg-red-500'}`} />
                    {isRecording && (
                        <div className="absolute inset-0 rounded-full border-[3px] border-teal-400 animate-ping opacity-20" />
                    )}
                </div>
                <span className={`${isRecording ? 'text-teal-600' : 'text-red-500'} font-mono font-bold text-sm tracking-wide min-w-[48px]`}>
                    {isRecording ? formatTime(seconds) : '已暂停'}
                </span>
            </button>
        </motion.div>
    );
};

export default RecordingFloatBubble;
