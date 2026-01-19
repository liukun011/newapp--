import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { TranscriptionItem } from '../types';

interface RecordingState {
  // Data
  currentDealId: string | null;
  currentInterviewInstId: string | null;
  currentInterviewInstTitle: string | null;
  transcriptionList: TranscriptionItem[];

  // Status
  isRecording: boolean;
  recordingSeconds: number;

  // Actions
  setData: (data: { dealId?: string; interviewInstId?: string; title?: string }) => void;
  setIsRecording: (isRecording: boolean) => void;
  setRecordingSeconds: (seconds: number | ((prev: number) => number)) => void;
  setTranscriptionList: (list: TranscriptionItem[]) => void;
  addTranscriptionChunk: (item: TranscriptionItem) => void;
  reset: () => void;
}

export const useRecordingStore = create<RecordingState>()(
  persist(
    (set) => ({
      currentDealId: null,
      currentInterviewInstId: null,
      currentInterviewInstTitle: null,
      transcriptionList: [],
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

      addTranscriptionChunk: (item) => set((state) => ({
        transcriptionList: [...state.transcriptionList, item]
      })),

      reset: () => set({
        currentDealId: null,
        currentInterviewInstId: null,
        currentInterviewInstTitle: null,
        transcriptionList: [],
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
