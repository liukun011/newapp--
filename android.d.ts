export { };

declare global {
    interface Window {
        Android?: {
            /**
             * Start recording and real-time transcription.
             * @param surveyId Unique ID for the survey session.
             */
            startRecord: (surveyId: string) => void;

            /**
             * Stop recording.
             * Returns empty string, file path is returned via callback.
             */
            stopRecord: () => string;

            /**
             * Get local recording files for a survey.
             * Returns JSON string of File objects.
             */
            getLocaFiles: (surveyId: string) => string;

            // Legacy / Plugin Integration (Optional)
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
        onRecordingError?: (code: string, message: string) => void;
        onRecordingStarted?: (message: string) => void;

        // Native Plugin Callbacks
        onVoiceStream?: (text: string, roleId: string) => void;
        onVoiceFileSaved?: (filePath: string) => void;

        onFileSelected?: (filePath: string) => void;
        onNativeBack?: () => void;
    }
}
