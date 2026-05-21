/// <reference types="vite/client" />
/// <reference types="vite-plugin-svgr/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_ENV?: 'dev' | 'test' | 'prod';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
declare global {
  interface Window {
    onVoiceStream?: (text: string, roleId: string) => void;
    onVoiceFileSaved?: (filePath: string) => void;
    onRecordingChunk?: (filePath: string) => void;
    onRecordingError?: (code: string, message: string) => void;
    onNativeBack?: () => void;
    Android?: {
      stopRecord: () => void;
    };
  }
}
