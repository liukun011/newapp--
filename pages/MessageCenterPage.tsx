import React, { useState } from 'react';
import { ArrowLeft, CheckCircle, ShieldAlert, MessageSquare } from 'lucide-react';
import { Toast } from 'react-vant';

interface Message {
  id: string;
  type: 'report' | 'compliance' | 'assistant';
  title: string;
  content: string;
  time: string;
  isRead: boolean;
}

const MOCK_MESSAGES: Message[] = [
  {
    id: '1',
    type: 'report',
    title: '报告生成成功',
    content: '“李总” 的访谈报告已由 AI 深度解析完成，快去查看吧。',
    time: '2026-01-07 19:03',
    isRead: false,
  },
  {
    id: '2',
    type: 'compliance',
    title: '合规性提醒',
    content: '检测到您的模版包含过期的业务术语，建议尽快更新...',
    time: '2026-01-07 19:03',
    isRead: false,
  },
  {
    id: '3',
    type: 'assistant',
    title: '访谈助手消息',
    content: '今日还有 2 场访谈待进行，AI 已经为您准备好了相关...',
    time: '2026-01-07 19:03',
    isRead: true, // Assuming this one is read for variety, or make it false if desired
  },
];

interface MessageCenterPageProps {
  onBack: () => void;
}

const MessageCenterPage: React.FC<MessageCenterPageProps> = ({ onBack }) => {
  const [messages, setMessages] = useState<Message[]>(MOCK_MESSAGES);

  const handleMarkAllRead = () => {
    setMessages(prev => prev.map(msg => ({ ...msg, isRead: true })));
    Toast.success('已全部标记为已读');
  };

  const handleMessageClick = (id: string) => {
    setMessages(prev => prev.map(msg => 
      msg.id === id ? { ...msg, isRead: true } : msg
    ));
    // Additional navigation logic can go here
  };

  const getIcon = (type: Message['type']) => {
    switch (type) {
      case 'report':
        return (
          <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0">
             <CheckCircle  className="text-green-500" size={20} fill="currentColor" color="white" />
          </div>
        ); 
        // Note: For filled check circle style:
        // Adjusting: container green-50, icon green-500. 
        // Design shows a solid green circle with white check.
        // Let's try: bg-green-100 text-green-500? Or solid green.
        // Image: Light green background circle, darker green check inside? Or White check inside Green circle.
        // The image shows: Very light green circle container. Inside is a green checkmark icon.
        
      case 'compliance':
        return (
           <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center flex-shrink-0">
             <ShieldAlert className="text-orange-400" size={20} fill="currentColor" color="white" />
           </div>
        );
      case 'assistant':
        return (
           <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center flex-shrink-0">
             <MessageSquare className="text-indigo-500" size={20} fill="currentColor" color="white" />
           </div>
        );
    }
  };

  // Re-adjusting icon styles to match image better:
  // Image 1 (Report): Light green bg, Green solid circle with white check inside? No, it looks like a CheckCircle icon inside a light green wrapper.
  // The icon itself has a filled background. CheckCircle with fill="currentColor" and text-green-500 works.
  
  return (
    <div className="min-h-screen bg-[#F7F8FA] flex flex-col">
      {/* Header */}
      <div className="bg-white px-4 py-3 flex items-center justify-between border-b border-gray-100 sticky top-0 z-10">
        <button 
          onClick={onBack}
          className="p-1 -ml-1 text-slate-700 active:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-[17px] font-bold text-slate-800 ml-6">消息中心</h1>
        <button 
          onClick={handleMarkAllRead}
          className="text-[14px] text-slate-500 active:text-slate-800 transition-colors"
        >
          全部已读
        </button>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto hidden-scrollbar">
        {messages.map((msg) => (
          <div 
            key={msg.id}
            onClick={() => handleMessageClick(msg.id)}
            className="flex gap-3 px-4 py-4 bg-white border-b border-gray-50 active:bg-gray-50 transition-colors"
          >
            {/* Icon */}
            {getIcon(msg.type)}

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start mb-1">
                 <h3 className="text-[16px] font-bold text-slate-800">{msg.title}</h3>
                 <span className="text-[12px] text-gray-400 font-medium">{msg.time}</span>
              </div>
              <div className="flex justify-between items-start gap-2">
                 <p className="text-[13px] text-slate-500 leading-snug line-clamp-2">
                   {msg.content}
                 </p>
                 {/* Red Dot */}
                 {!msg.isRead && (
                   <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0 mt-1.5" />
                 )}
              </div>
            </div>
          </div>
        ))}

        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
             <span>暂无消息</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageCenterPage;
