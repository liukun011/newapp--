import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { TranscriptionItem } from '../types';

interface RecordingState {
  // Data
  currentDealId: string | null;
  currentInterviewInstId: string | null;
  currentInterviewInstTitle: string | null;
  transcriptionList: TranscriptionItem[];
  tempTranscription: string;  // 临时的中间结果

  // Status
  isRecording: boolean;
  recordingSeconds: number;

  // Actions
  setData: (data: { dealId?: string; interviewInstId?: string; title?: string }) => void;
  setIsRecording: (isRecording: boolean) => void;
  setRecordingSeconds: (seconds: number | ((prev: number) => number)) => void;
  setTranscriptionList: (list: TranscriptionItem[]) => void;
  addTranscriptionChunk: (item: TranscriptionItem) => void;
  updateTempTranscription: (text: string) => void;
  clearTempTranscription: () => void;
  reset: () => void;
}

export const useRecordingStore = create<RecordingState>()(
  persist(
    (set) => ({
      currentDealId: null,
      currentInterviewInstId: null,
      currentInterviewInstTitle: null,
      transcriptionList: [],
      tempTranscription: '',
      isRecording: false,
      recordingSeconds: 0,

      setData: (data) => set((state) => ({
        currentDealId: data.dealId !== undefined ? data.dealId : state.currentDealId,
        currentInterviewInstId: data.interviewInstId !== undefined ? data.interviewInstId : state.currentInterviewInstId,
        currentInterviewInstTitle: data.title !== undefined ? data.title : state.currentInterviewInstTitle,
      })),

      setIsRecording: (isRecording) => set({ isRecording }),

      setRecordingSeconds: (seconds) => set((state) => ({
        recordingSeconds: typeof seconds === 'function' ? seconds(state.recordingSeconds) : seconds
      })),

      setTranscriptionList: (list) => set({ transcriptionList: list }),

      addTranscriptionChunk: (item) => set((state) => {
        // 仅在录音开启时才接收转写数据，防止其他页面的局部录音(如VoiceInputModal)干扰
        if (!state.isRecording) return {};
        return {
          transcriptionList: [...state.transcriptionList, item],
          tempTranscription: '',  // 添加最终结果时清空临时结果
        };
      }),

      updateTempTranscription: (text) => set((state) => {
         if (!state.isRecording) return {};
         return { tempTranscription: text };
      }),

      clearTempTranscription: () => set({ tempTranscription: '' }),

      reset: () => set({
        currentDealId: null,
        currentInterviewInstId: null,
        currentInterviewInstTitle: null,
        transcriptionList: [],
        tempTranscription: '',
        isRecording: false,
        recordingSeconds: 0
      }),
    }),
    {
      name: 'zov-recording-storage', // unique name
      storage: createJSONStorage(() => sessionStorage), // use sessionStorage as requested implicitly by previous code
    }
  )
);
