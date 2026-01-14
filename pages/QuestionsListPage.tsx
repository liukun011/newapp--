import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, FileText, Pencil, ArrowUp, Plus, Minus } from 'lucide-react';
import { QuestionInfo } from '../types';

interface QuestionsListPageProps {
  dealName?: string;
  dealLogo?: string;
  questionInfoList?: QuestionInfo[];
  onBack: () => void;
  onUpdateQuestion?: (question: QuestionInfo) => void;
  onDeleteQuestion?: (questionId: string) => void;
}

// 编辑问题弹框组件
interface EditQuestionModalProps {
  visible: boolean;
  question: QuestionInfo | null;
  onClose: () => void;
  onConfirm: (questionName: string) => void;
}

const EditQuestionModal: React.FC<EditQuestionModalProps> = ({
  visible,
  question,
  onClose,
  onConfirm,
}) => {
  const [editedName, setEditedName] = useState('');

  useEffect(() => {
    if (question) {
      setEditedName(question.questionName);
    }
  }, [question]);

  if (!visible || !question) return null;

  const handleConfirm = () => {
    if (editedName.trim()) {
      onConfirm(editedName.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-2xl w-[85%] max-w-[340px] shadow-xl animate-fadeIn">
        {/* Header */}
        <div className="pt-5 pb-3 text-center">
          <h3 className="text-lg font-semibold text-slate-800">编辑问题</h3>
        </div>
        
        {/* Content */}
        <div className="px-5 pb-5">
          <div className="relative">
            <textarea
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              className="w-full min-h-[120px] p-4 text-base text-slate-700 bg-gray-50 rounded-xl border border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none resize-none transition-all"
              placeholder="请输入问题内容"
            />
          </div>
        </div>
        
        {/* Footer Buttons */}
        <div className="flex border-t border-gray-100">
          <button
            onClick={onClose}
            className="flex-1 py-4 text-center text-slate-600 font-medium hover:bg-gray-50 rounded-bl-2xl transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 py-4 text-center text-white font-medium rounded-br-2xl transition-colors"
            style={{ background: 'linear-gradient(135deg, #4E3EF8 0%, #6B5EFF 100%)' }}
          >
            确认
          </button>
        </div>
      </div>
    </div>
  );
};

const QuestionsListPage: React.FC<QuestionsListPageProps> = ({ 
  dealName = '尽调详情',
  dealLogo,
  questionInfoList = [],
  onBack,
  onUpdateQuestion,
  onDeleteQuestion,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  
  // 编辑弹框状态
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuestionInfo | null>(null);

  // 监听滚动显示回到顶部按钮
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      setShowScrollTop(container.scrollTop > 200);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // 回到顶部
  const scrollToTop = () => {
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 添加新问题
  const handleAddQuestion = () => {
    // TODO: 实现添加问题逻辑
    console.log('Add new question');
  };

  // 点击编辑按钮，打开弹框
  const handleEditQuestion = (question: QuestionInfo) => {
    setEditingQuestion(question);
    setEditModalVisible(true);
  };

  // 关闭编辑弹框
  const handleCloseEditModal = () => {
    setEditModalVisible(false);
    setEditingQuestion(null);
  };

  // 确认编辑
  const handleConfirmEdit = (questionName: string) => {
    if (editingQuestion && onUpdateQuestion) {
      onUpdateQuestion({
        ...editingQuestion,
        questionName,
      });
    }
    handleCloseEditModal();
  };

  // 删除问题
  const handleDeleteQuestion = (questionId: string) => {
    if (onDeleteQuestion) {
      onDeleteQuestion(questionId);
    }
  };

  // 按 questionIndex 排序
  const sortedQuestions = [...questionInfoList].sort((a, b) => a.questionIndex - b.questionIndex);
  const totalQuestions = questionInfoList.length;

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* NavBar */}
      <div className="flex items-center justify-center px-4 py-3 relative border-b border-gray-100">
        <button 
          onClick={onBack} 
          className="absolute left-4 p-2 text-slate-700 hover:bg-slate-50 rounded-full active:bg-slate-100 transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-lg font-semibold text-slate-800">常用问题集合</h1>
      </div>

      {/* Content */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-4 pb-24"
      >
        {/* Deal Info Card */}
        <div className="mt-4 bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {/* 尽调 Logo */}
              <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center overflow-hidden">
                {dealLogo ? (
                  <img src={dealLogo} alt="logo" className="w-full h-full object-cover" />
                ) : (
                  <FileText size={20} className="text-indigo-600" />
                )}
              </div>
              <span className="font-bold text-slate-800">{dealName}</span>
            </div>
            <span className="text-sm text-gray-400">共{totalQuestions}个问题</span>
          </div>

          {/* Questions List */}
          <div className="divide-y divide-gray-100">
            {sortedQuestions.map((question) => (
              <div 
                key={question.id}
                className="flex items-center justify-between py-4"
              >
                <span className={`text-sm flex-1 pr-2 ${question.CHECKED ? 'text-indigo-600 underline' : 'text-slate-700'}`}>
                  {question.questionIndex}.{question.questionName}
                </span>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {/* 编辑按钮 */}
                  <button 
                    onClick={() => handleEditQuestion(question)}
                    className="p-2 text-gray-300 hover:text-indigo-500 transition-colors"
                  >
                    <Pencil size={16} />
                  </button>
                  {/* 删除按钮 */}
                  <button 
                    onClick={() => handleDeleteQuestion(question.id)}
                    className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                  >
                    <Minus size={16} className="border border-current rounded-full" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Empty State */}
          {sortedQuestions.length === 0 && (
            <div className="py-12 text-center text-gray-400">
              暂无问题
            </div>
          )}
        </div>
      </div>

      {/* Floating Buttons */}
      <div className="fixed right-4 bottom-24 flex flex-col gap-3">
        {/* Scroll to Top Button */}
        {showScrollTop && (
          <button 
            onClick={scrollToTop}
            className="w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center text-slate-600 hover:text-indigo-600 transition-colors border border-gray-100"
          >
            <ArrowUp size={20} />
          </button>
        )}
        
        {/* Add Question Button */}
        <button 
          onClick={handleAddQuestion}
          className="w-12 h-12 rounded-full shadow-lg flex items-center justify-center text-white transition-transform active:scale-95"
          style={{ background: 'linear-gradient(135deg, #4E3EF8 0%, #6B5EFF 100%)' }}
        >
          <Plus size={24} />
        </button>
      </div>

      {/* 编辑问题弹框 */}
      <EditQuestionModal
        visible={editModalVisible}
        question={editingQuestion}
        onClose={handleCloseEditModal}
        onConfirm={handleConfirmEdit}
      />
    </div>
  );
};

export default QuestionsListPage;
