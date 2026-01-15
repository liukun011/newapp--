import React, { useState, useEffect } from 'react';
import { ArrowLeft, History, Pause, Mic, Square } from 'lucide-react';
import SoundWave from '../components/SoundWave';
import Button from '../components/Button';
import { MOCK_QUESTIONS, MOCK_CHAT } from '../constants';
import { Question } from '../types';

interface RecordingPageProps {
  onBack: () => void;
}

const RecordingPage: React.FC<RecordingPageProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'questions' | 'transcription'>('questions');
  const [isRecording, setIsRecording] = useState(true);
  const [seconds, setSeconds] = useState(0);
  const [questions, setQuestions] = useState<Question[]>(MOCK_QUESTIONS);
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(null);

  // Timer logic
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isRecording) {
      interval = setInterval(() => {
        setSeconds(s => s + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const formatTime = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleQuestion = (id: number) => {
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, isAnswered: !q.isAnswered } : q));
  };

  return (
    <div className="flex flex-col h-screen relative bg-[#F7F8FA]">
      
      {/* NavBar */}
      <div className="bg-white px-4 py-3 flex items-center justify-between sticky top-0 z-20 shadow-sm">
        <button onClick={onBack} className="p-2 -ml-2 text-slate-700">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-lg font-bold text-slate-800">A公司流贷尽调</h1>
        <button className="p-2 -mr-2 text-slate-700">
          <History size={22} />
        </button>
      </div>

      {/* Header Area: Timer & SoundWave */}
      <div className="bg-white pt-6 pb-2 text-center z-10">
        <SoundWave isRecording={isRecording} />
        <div className="mt-2 text-3xl font-mono font-medium text-slate-800 tracking-wider">
          {formatTime(seconds)}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white mt-1 border-t border-gray-100 z-10 sticky top-[60px]">
        <div className="flex">
          <button 
            className={`flex-1 py-3 text-sm font-medium relative transition-colors ${activeTab === 'questions' ? 'text-indigo-600' : 'text-gray-500'}`}
            onClick={() => setActiveTab('questions')}
          >
            问题清单
            {activeTab === 'questions' && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-[3px] bg-indigo-600 rounded-t-full" />
            )}
          </button>
          <button 
            className={`flex-1 py-3 text-sm font-medium relative transition-colors ${activeTab === 'transcription' ? 'text-indigo-600' : 'text-gray-500'}`}
            onClick={() => setActiveTab('transcription')}
          >
            录音转写
            {activeTab === 'transcription' && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-[3px] bg-indigo-600 rounded-t-full" />
            )}
          </button>
        </div>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto pb-24 p-4 scroll-smooth">
        {activeTab === 'questions' ? (
          <div className="space-y-3">
             <div className="text-xs text-gray-400 mb-2 pl-1">已自动匹配 2 / {questions.length} 项</div>
             {questions.map((q) => (
               <div key={q.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-50">
                 <div className="flex items-start justify-between">
                   <div 
                    className="flex-1 pr-4 cursor-pointer"
                    onClick={() => setExpandedQuestion(expandedQuestion === q.id ? null : q.id)}
                   >
                     <h3 className={`text-[15px] leading-snug font-medium ${q.isAnswered ? 'text-gray-800' : 'text-gray-600'}`}>
                       {q.id}. {q.text}
                     </h3>
                     {expandedQuestion === q.id && q.details && (
                       <p className="mt-2 text-xs text-gray-500 leading-relaxed bg-gray-50 p-2 rounded-lg">
                         💡 {q.details}
                       </p>
                     )}
                   </div>
                   <button 
                    onClick={() => toggleQuestion(q.id)}
                    className="mt-0.5 min-w-[20px]"
                   >
                     {q.isAnswered ? (
                       <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center text-white">
                         <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                       </div>
                     ) : (
                       <div className="w-5 h-5 rounded-full border-2 border-gray-300"></div>
                     )}
                   </button>
                 </div>
               </div>
             ))}
          </div>
        ) : (
          <div className="space-y-6">
            {MOCK_CHAT.map((msg) => (
              <div key={msg.id} className="flex gap-3">
                <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs text-white ${msg.sender === 'User' ? 'bg-indigo-500' : 'bg-orange-400'}`}>
                  {msg.sender === 'User' ? '我' : '访'}
                </div>
                <div className="flex-1">
                  <div className="text-xs text-gray-400 mb-1">{msg.sender === 'User' ? '访谈对象1' : '访谈对象2'}</div>
                  <div className="bg-white p-3 rounded-lg rounded-tl-none shadow-sm text-sm text-gray-800 leading-relaxed">
                    {msg.text}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sticky Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-6 py-4 pb-8 z-30 flex gap-4 items-center justify-between shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <Button 
          variant="primary" 
          onClick={() => setIsRecording(!isRecording)}
          className="flex-1 rounded-full shadow-lg shadow-indigo-200"
        >
          {isRecording ? (
            <>
              <Pause size={18} className="mr-2" /> 暂停录音
            </>
          ) : (
             <>
              <Mic size={18} className="mr-2" /> 继续录音
            </>
          )}
        </Button>
        
        <Button 
          variant="secondary"
          onClick={onBack}
          className="flex-1 rounded-full border-indigo-100 text-indigo-600"
        >
          <Square size={16} className="mr-2 fill-current" /> 结束访谈
        </Button>
      </div>
    </div>
  );
};

export default RecordingPage;