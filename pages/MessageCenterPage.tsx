import React, { useState } from 'react';
import { ArrowLeft, Check, ShieldAlert, MessageSquare } from 'lucide-react';
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
    content: '“李总” 的访谈报告已由系统深度解析完成，快去查看吧。',
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
    content: '今日还有 2 场访谈待进行，系统已经为您准备好了相关...',
    time: '2026-01-07 19:03',
    isRead: false,
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

  // 监听原生返回键
  React.useEffect(() => {
    const handleNativeBack = (e: Event) => {
      e.preventDefault();
      onBack();
    };

    window.addEventListener('requestNativeBack', handleNativeBack);
    return () => {
      window.removeEventListener('requestNativeBack', handleNativeBack);
    };
  }, [onBack]);

  const getIcon = (type: Message['type']) => {
    switch (type) {
      case 'report':
        return (
          <div className="w-10 h-10 rounded-[999px] bg-[#E8F8F0] flex items-center justify-center flex-shrink-0">
             <div className="w-5 h-5 rounded-[999px] bg-[#10B981] flex items-center justify-center">
                <Check size={12} className="text-white" strokeWidth={3} />
             </div>
          </div>
        ); 
      case 'compliance':
        return (
           <div className="w-10 h-10 rounded-[999px] bg-[#2563EB1A] flex items-center justify-center flex-shrink-0">
             <ShieldAlert className="text-[#4C8BF5]" size={20} />
           </div>
        );
      case 'assistant':
        return (
           <div className="w-10 h-10 rounded-[999px] bg-[#2563EB1A] flex items-center justify-center flex-shrink-0">
             <MessageSquare className="text-primary" size={20} />
           </div>
        );
    }
  };

  return (
    <div className="h-screen bg-[#F7FAFE] flex flex-col">
      {/* Header */}
      <div className="bg-[#FFFFFF] px-4 py-3 flex items-center justify-between relative shadow-[0_3px_10px_rgba(15,40,72,0.04)] z-10">
        <button 
          onClick={onBack}
          className="p-2 -ml-2 text-[#476285] active:bg-[#F7FAFE] rounded-[999px] transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-[17px] font-medium text-[#0F2848] absolute left-1/2 -translate-x-1/2">消息中心</h1>
        <button 
          onClick={handleMarkAllRead}
          className="text-[14px] text-slate-500 active:text-[#0F2848] transition-colors font-medium"
        >
          全部已读
        </button>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto">
        {messages.map((msg) => (
          <div 
            key={msg.id}
            onClick={() => handleMessageClick(msg.id)}
            className="flex gap-3 px-4 py-4 bg-[#FFFFFF] border-b border-gray-50 active:bg-[#F7FAFE] transition-colors"
          >
            {/* Icon */}
            {getIcon(msg.type)}

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start mb-1">
                 <h3 className="text-[16px] font-medium text-[#0F2848]">{msg.title}</h3>
                 <span className="text-[12px] text-[#8AA2BF]">{msg.time}</span>
              </div>
              <div className="relative">
                 <p className="text-[13px] text-[#476285] leading-snug line-clamp-1 pr-4">
                   {msg.content}
                 </p>
                 {/* Red Dot - Aligned to the right end or just after text? Screenshot shows it at far right vertically centered or near text. 
                     Let's put it absolutely to the right. */}
                 {!msg.isRead && (
                   <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-[999px] bg-[#FF4D4F]" />
                 )}
              </div>
            </div>
          </div>
        ))}

        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-[#8AA2BF]">
             <span>暂无消息</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageCenterPage;
