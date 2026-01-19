export { };

declare global {
    interface Window {
        Android?: {
            startRecord: (surveyId: string) => void;
            stopRecord: () => string;
            // Native Plugin Integration
            startRequestVoice: () => void;
            stopRequestVoice: () => void;
            
            audioToText: (path: string) => string;
            takePhoto: () => void;
            choosePhoto: () => void;
            chooseFile: () => void;
            closeApp: () => void;
        };
        // Callbacks
        onRecordingChunk?: (filePath: string) => void;
        onRecordingError?: (errorMessage: string) => void;
        onRecordingStarted?: (message: string) => void;
        
        // Native Plugin Callbacks
        onVoiceStream?: (text: string, roleId: string) => void;
        onVoiceFileSaved?: (filePath: string) => void;
        
        onFileSelected?: (filePath: string) => void;
        onNativeBack?: () => void;
    }
}
