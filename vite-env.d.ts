/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_ENV?: 'development' | 'test' | 'production';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
declare module '*.svg' {

  import * as React from 'react';
  export const ReactComponent: React.FunctionComponent<React.SVGProps<SVGSVGElement> & { title?: string }>;
  const src: string;
  export default src;
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
