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
        bubbleControls.start({ scale: 0.85, opacity: 1, x: initialX });
    }, [bubbleControls, initialX]);

    return (
        <motion.div
            ref={bubbleRef}
            drag
            dragConstraints={appContainerRef}
            dragMomentum={false}
            whileDrag={{ scale: 1.0 }} // Regular size while dragging
            initial={{ scale: 0.85, opacity: 0 }}
            animate={bubbleControls}
            exit={{ scale: 0, opacity: 0 }}
            onDragEnd={() => {
                // 吸附逻辑：松手时判断中心点位置，吸附到最近的容器边缘
                const containerRect = appContainerRef.current?.getBoundingClientRect();
                if (bubbleRef.current && containerRect) {
                    const rect = bubbleRef.current.getBoundingClientRect();
                    const winW = window.innerWidth;
                    const targetScale = 0.85; // target idle scale
                    
                    // Unscaled width (currentScale is 1.0 during drag)
                    const baseWidth = rect.width;
                    
                    const centerX = rect.left + rect.width / 2;
                    const containerCenterX = containerRect.left + containerRect.width / 2;
                    
                    // Correct symmetric margin calculation (Center-based)
                    // Visual Margin = 16px
                    if (centerX < containerCenterX) {
                        // Snap Left
                        // Formula: ContainerLeft + 32 - WinW + Width * (0.5 + TargetScale/2)
                        // TargetScale/2 = 0.85/2 = 0.425. Factor = 0.925
                        const xLeft = containerRect.left + 32 - winW + baseWidth * 0.925;
                        
                        bubbleControls.start({ 
                            x: xLeft, 
                            scale: targetScale,
                            transition: { type: 'spring', stiffness: 400, damping: 30 } 
                        });
                    } else {
                        // Snap Right
                        // Formula: ContainerRight - WinW + Width * (0.5 - TargetScale/2)
                        // Factor = 0.075
                        const xRight = containerRect.right - winW + baseWidth * 0.075;
                        
                        bubbleControls.start({ 
                            x: xRight, 
                            scale: targetScale,
                            transition: { type: 'spring', stiffness: 400, damping: 30 } 
                        });
                    }
                }
            }}
            className="fixed right-4 top-[120px] z-50 touch-none cursor-move"
        >
            <button
                onClick={onClick}
                className="bg-[#FFFFFF] rounded-[10px] w-[60px] h-[60px] shadow-lg flex flex-col items-center justify-center gap-1 border border-teal-50 transition-transform"
            >
                <div className={`w-6 h-6 rounded-[999px] border-[3px] flex items-center justify-center relative ${isRecording ? 'border-teal-400' : 'border-red-400'}`}>
                    <div className={`w-2 h-2 rounded-[999px] ${isRecording ? 'bg-teal-500' : 'bg-red-500'}`} />
                    {isRecording && (
                        <div className="absolute inset-0 rounded-[999px] border-[3px] border-teal-400 animate-ping opacity-20" />
                    )}
                </div>
                <span 
                    style={{
                        fontFamily: "'Alibaba PuHuiTi 2.0', sans-serif",
                        fontSize: '14px',
                        fontWeight: 'normal',
                        lineHeight: 'normal',
                        letterSpacing: '0em',
                        fontVariationSettings: '"opsz" auto',
                        fontFeatureSettings: '"kern" on',
                        color: isRecording ? '#00A8A8' : '#DC2626'
                    }}
                    className="leading-none"
                >
                    {isRecording ? formatTime(seconds) : '已暂停'}
                </span>
            </button>
        </motion.div>
    );
};

export default RecordingFloatBubble;
