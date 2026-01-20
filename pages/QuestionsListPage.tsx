import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, FileText, Pencil, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { Toast } from 'react-vant';
import { QuestionInfo } from '../types';

interface QuestionsListPageProps {
  dealName?: string;
  dealLogo?: string;
  questionInfoList?: QuestionInfo[];
  onBack: () => void;
  onUpdateQuestion?: (question: QuestionInfo) => void;
  onDeleteQuestion?: (questionId: string) => void;
  onAddQuestion?: (questionName: string) => void;
  isArchived?: boolean;
}

// 编辑问题弹框组件
interface EditQuestionModalProps {
  visible: boolean;
  question: QuestionInfo | null;
  onClose: () => void;
  onConfirm: (questionName: string) => void;
}

// 新增问题弹框组件
interface AddQuestionModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (questionName: string) => void;
}

const AddQuestionModal: React.FC<AddQuestionModalProps> = ({
  visible,
  onClose,
  onConfirm,
}) => {
  const [newQuestionName, setNewQuestionName] = useState('');

  // 每次打开弹框清空输入
  useEffect(() => {
    if (visible) {
      setNewQuestionName('');
    }
  }, [visible]);

  if (!visible) return null;

  const handleConfirm = () => {
    if (newQuestionName.trim()) {
      onConfirm(newQuestionName.trim());
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-2xl w-[85%] max-w-[340px] shadow-xl animate-fadeIn">
        {/* Header */}
        <div className="pt-5 pb-3 text-center">
          <h3 className="text-lg font-semibold text-slate-800">新增问题</h3>
        </div>
        
        {/* Content */}
        <div className="px-5 pb-5">
          <div className="relative">
            <textarea
              value={newQuestionName}
              onChange={(e) => setNewQuestionName(e.target.value)}
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
    </div>,
    document.body
  );
};

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

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
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
    </div>,
    document.body
  );
};

const QuestionsListPage: React.FC<QuestionsListPageProps> = ({ 
  dealName = '尽调详情',
  dealLogo,
  questionInfoList = [],
  onBack,
  onUpdateQuestion,
  onDeleteQuestion,
  onAddQuestion,
  isArchived = false,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  
  // 编辑弹框状态
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuestionInfo | null>(null);
  
  // 新增弹框状态
  const [addModalVisible, setAddModalVisible] = useState(false);
  
  // 删除确认弹框状态
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deletingQuestion, setDeletingQuestion] = useState<QuestionInfo | null>(null);

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

  // 点击添加按钮
  const handleAddQuestionClick = () => {
    setAddModalVisible(true);
  };

  // 确认添加
  const handleConfirmAdd = (questionName: string) => {
    if (onAddQuestion) {
      onAddQuestion(questionName);
      Toast.success('添加成功');
    }
    setAddModalVisible(false);
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
      Toast.success('修改成功');
    }
    handleCloseEditModal();
  };

  // 打开删除确认弹框
  const handleOpenDeleteModal = (question: QuestionInfo) => {
    setDeletingQuestion(question);
    setDeleteModalVisible(true);
  };

  // 关闭删除确认弹框
  const handleCloseDeleteModal = () => {
    setDeleteModalVisible(false);
    setDeletingQuestion(null);
  };

  // 确认删除问题
  const handleConfirmDelete = () => {
    if (deletingQuestion && onDeleteQuestion) {
      onDeleteQuestion(deletingQuestion.id!);
      Toast.success('删除成功');
    }
    handleCloseDeleteModal();
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
        className="flex-1 overflow-hidden px-4 pb-24"
      >
        {/* Deal Info Card */}
        <div className="mt-4 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Fixed Header */}
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
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
          </div>

          {/* Scrollable Questions List */}
          <div ref={scrollContainerRef} className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 280px)' }}>
            <div className="divide-y divide-gray-100 px-4">
              {sortedQuestions.map((question) => (
                <div 
                  key={question.id}
                  className="flex items-center justify-between py-4"
                >
                  <span className={`text-sm flex-1 pr-2 ${question.CHECKED ? 'text-indigo-600 underline' : 'text-slate-700'}`}>
                    {question.questionIndex}.{question.questionName}
                  </span>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {/* 编辑按钮 - 仅未归档时显示 */}
                    {!isArchived && (
                      <button 
                        onClick={() => handleEditQuestion(question)}
                        className="p-2 text-gray-300 hover:text-indigo-500 transition-colors"
                      >
                        <Pencil size={16} />
                      </button>
                    )}
                    {/* 删除按钮 - 仅未归档时显示 */}
                    {!isArchived && (
                      <button 
                        onClick={() => handleOpenDeleteModal(question)}
                        className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
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
        {/* Scroll to Top Button - Standard logic for non-archived state */}
        {(!isArchived && showScrollTop) && (
          <button 
            onClick={scrollToTop}
            className="w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center text-slate-600 hover:text-indigo-600 transition-colors border border-gray-100"
          >
            <ArrowUp size={20} />
          </button>
        )}
        
        {/* Main Action Button: Add Question (Normal) OR Scroll Top (Archived) */}
        <button 
          onClick={isArchived ? scrollToTop : handleAddQuestionClick}
          className="w-12 h-12 rounded-full shadow-lg flex items-center justify-center text-white transition-transform active:scale-95"
          style={{ background: 'linear-gradient(135deg, #4E3EF8 0%, #6B5EFF 100%)' }}
        >
          {isArchived ? <ArrowUp size={24} /> : <Plus size={24} />}
        </button>
      </div>

      {/* 新增问题弹框 */}
      <AddQuestionModal
        visible={addModalVisible}
        onClose={() => setAddModalVisible(false)}
        onConfirm={handleConfirmAdd}
      />

      {/* 编辑问题弹框 */}
      <EditQuestionModal
        visible={editModalVisible}
        question={editingQuestion}
        onClose={handleCloseEditModal}
        onConfirm={handleConfirmEdit}
      />

      {/* 删除确认弹框 - Portal to Body */}
      {deleteModalVisible && deletingQuestion && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50"
            onClick={handleCloseDeleteModal}
          />
          
          {/* Modal */}
          <div className="relative bg-white rounded-2xl w-[85%] max-w-[320px] shadow-xl animate-fadeIn overflow-hidden">
            {/* Header */}
            <div className="pt-6 pb-4 px-6 text-center">
              <div className="w-14 h-14 mx-auto mb-4 bg-red-50 rounded-full flex items-center justify-center">
                <Trash2 size={24} className="text-red-500" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800 mb-2">删除问题</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                确定要删除该问题吗？删除后无法恢复。
              </p>
            </div>
            
            {/* Footer Buttons */}
            <div className="flex border-t border-gray-100">
              <button
                onClick={handleCloseDeleteModal}
                className="flex-1 py-4 text-center text-slate-600 font-medium hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 py-4 text-center text-white font-medium bg-red-500 hover:bg-red-600 transition-colors"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default QuestionsListPage;
