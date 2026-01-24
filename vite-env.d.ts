/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_ENV?: 'development' | 'test' | 'production';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
interface Window {
  onNativeBack?: () => void;
  onVoiceStream?: (text: string, roleId: string) => void;
  onRecordingChunk?: (filePath: string) => void;
  onVoiceFileSaved?: (filePath: string) => void;
  onRecordingError?: (code: string, message: string) => void;
  onFileSelected?: (filePath: string, fileBase64?: string) => void;
}
declare module '*.svg' {

  import * as React from 'react';
  export const ReactComponent: React.FunctionComponent<React.SVGProps<SVGSVGElement> & { title?: string }>;
  const src: string;
  export default src;
}
