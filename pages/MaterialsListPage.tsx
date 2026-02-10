import React, { useState, useEffect, useCallback } from 'react';
import { useThrottleFn } from '../hooks/useThrottleFn';
import { ArrowLeft, Camera, Image as ImageIcon, FileText, Mic, MinusCircle, Pencil, RefreshCw } from 'lucide-react';
import { Toast, Dialog } from 'react-vant';
import VoiceInputModal from '../components/VoiceInputModal';
import { dealService } from '../services/dealService';
import { nativeBridge } from '../services/nativeBridge';
import config from '../config';
import { Resource, DealReportStatusEnum } from '../types';
import Mascot from '@/components/Mascot';

interface MaterialsListPageProps {
  dealId?: string;
  onBack: () => void;
  onPreviewFile?: (name: string, url: string, fileId: string) => void;
  isArchived?: boolean;
  reportStatus?: any; // 报告状态
}

const MaterialsListPage: React.FC<MaterialsListPageProps> = ({ 
  dealId,
  onBack, 
  onPreviewFile,
  isArchived = false,
  reportStatus
}) => {
  const basePath = import.meta.env.BASE_URL || '/';
  const [resources, setResources] = useState<Resource[]>([]);
  const [voiceModalVisible, setVoiceModalVisible] = useState(false);
  const [voiceModalInitialContent, setVoiceModalInitialContent] = useState('');
  const [localReportStatus, setLocalReportStatus] = useState(reportStatus);
  
  // 重命名弹框状态
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [renameTarget, setRenameTarget] = useState<Resource | null>(null);
  const [newFileName, setNewFileName] = useState('');
  const [hasInterviewRecords, setHasInterviewRecords] = useState(false);

  // 监听 props reportStatus 的变化
  useEffect(() => {
    setLocalReportStatus(reportStatus);
  }, [reportStatus]);

  // 封装返回逻辑：离开前生成总结
  const handleBackWithSummary = useCallback(() => {
    if (dealId) {
      console.log('Leaving MaterialsListPage: Generating summary for dealId:', dealId);
      // Fire-and-forget call
      dealService.generateInterviewSummary(dealId).catch(err => {
        console.error('Failed to generate summary on exit:', err);
      });
    }
    onBack();
  }, [dealId, onBack]);

  // 获取尽调详情数据
  const fetchDealDetail = useCallback(async () => {
    if (!dealId) return;
    
    try {
      const res = await dealService.getDealInstDetail(dealId);
      if (res.success && res.data) {
        // 更新本地报告状态
        if (res.data.reportStatus !== undefined) {
          setLocalReportStatus(res.data.reportStatus);
        }

        const resources = res.data.resources || [];
        const supplementary = Array.isArray(res.data.supplementary) 
          ? (res.data.supplementary as Resource[]).map(r => ({ ...r, type: '4' }))
          : [];
        
        setResources([...supplementary, ...resources]);
        setHasInterviewRecords(res.data.interviewInstList && res.data.interviewInstList.length > 0);
      }
    } catch (error) {
      console.error('Failed to fetch deal detail:', error);
    }
  }, [dealId]);

  useEffect(() => {
    fetchDealDetail();
  }, [fetchDealDetail]);

  // 监听原生返回键
  useEffect(() => {
    const handleNativeBack = (e: Event) => {
      e.preventDefault();
      handleBackWithSummary();
    };

    window.addEventListener('requestNativeBack', handleNativeBack);
    return () => {
      window.removeEventListener('requestNativeBack', handleNativeBack);
    };
  }, [onBack]);



  // 上传状态锁，防止重复触发
  const isUploadingRef = React.useRef(false);

  // 监听原生文件选择回调 (及 Android ImageSelected)
  useEffect(() => {
    // Android Image Upload Flow
    const handleNativeImageUpload = async (localUrl: string) => {
      if (!dealId) return;
      if (isUploadingRef.current) return; // 防止重复触发
      
      isUploadingRef.current = true;
      try {
        Toast.loading({ message: '上传中...', duration: 0, forbidClick: true });
        
        // 1. 调用 Native 上传文件到 MinIO/OBS
        const token = localStorage.getItem('zov-user-token') || '';
        const uploadHost = config.uploadUrl; // 环境配置

        const params = {
          host: uploadHost,
          authorization: token,
          filePath: localUrl,
        };

        console.log('[Native上传] Params:', JSON.stringify(params, null, 2));
        console.log('[Native上传] 开始上传:', localUrl);
        
        const serverUrl = await new Promise<string>((resolve, reject) => {
           const resultHandler = (res: any) => {
             // 兼容 errno=0 或 success=true
             const resultData = res.data?.result || (res.data?.success !== undefined ? res.data : null);
             const isSuccess = res.success && (resultData?.success === true || resultData?.errno === 0);

             if (isSuccess) {
               const url = resultData.data?.url || resultData.url || (typeof resultData.data === 'string' ? resultData.data : "");
               if (url) {
                 nativeBridge.off('onUploadResult', resultHandler);
                 resolve(url);
               }
             } else if (res.success && res.data?.percent !== undefined) {
               // 进度
               // Toast.loading({ message: `上传中 ${res.data.percent}%...`, duration: 0 });
             } else {
               // 失败
               if (res.success === false || (resultData && resultData.success === false)) {
                 nativeBridge.off('onUploadResult', resultHandler);
                 reject(new Error(resultData?.message || res.message || '上传失败'));
               }
             }
           };

           nativeBridge.on('onUploadResult', resultHandler);
           nativeBridge.uploadInterviewFile(params);
           
           // 超时
           setTimeout(() => {
             nativeBridge.off('onUploadResult', resultHandler);
             reject(new Error('上传超时'));
           }, 60000);
        });

        console.log('[Native上传] 成功，URL:', serverUrl);

        // 2. 调用后端绑定接口
        const bindRes = await dealService.uploadDealResource(dealId, [serverUrl]);
        
        Toast.clear();
        if (bindRes.success) {
          Toast.success('上传成功');
          fetchDealDetail();
        } else {
          Toast.fail(bindRes.message || '保存失败');
        }

      } catch (error: any) {
        Toast.clear();
        console.error('Native upload flow failed:', error);
        Toast.fail(error.message || '上传失败');
      } finally {
        isUploadingRef.current = false;
      }
    };

    // 注册 imageSelected 监听 (直接使用 on 监听以便 cleanup)
    const handleImageSelected = (res: any) => {
        if (res.success && res.data && res.data.imageURL) {
            handleNativeImageUpload(res.data.imageURL);
        }
    };
    nativeBridge.on('imageSelected', handleImageSelected);

    // 监听文件选择回调
    const handleFileSelected = (res: any) => {
        // 根据提供的结构：res.data.fileURL
        if (res.success && res.data && res.data.fileURL) {
             const path = res.data.fileURL;
             console.log('[MaterialsListPage] 收到文件选择回调:', path);
             handleNativeImageUpload(path);
        } else {
             // 兼容旧逻辑或错误情况
             console.warn('[MaterialsListPage] 文件选择回调数据格式不匹配:', JSON.stringify(res));
        }
    };
    nativeBridge.on('fileSelected', handleFileSelected);



    return () => {

      nativeBridge.off('imageSelected', handleImageSelected);
      nativeBridge.off('fileSelected', handleFileSelected);
    };
  }, [dealId, fetchDealDetail]);

  // 引用隐藏的 input 元素
  const cameraInputRef = React.useRef<HTMLInputElement>(null);
  const galleryInputRef = React.useRef<HTMLInputElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleUploadClick = async (id: 'camera' | 'gallery' | 'file' | 'voice') => {
    switch (id) {
      case 'camera':
        nativeBridge.openCamera();
        break;
      case 'gallery':
        nativeBridge.openPhotoLibrary();
        break;
      case 'file':
        nativeBridge.chooseFile();
        break;
      case 'voice':
        // 检查是否已有补充文本，如果有则加载内容
        const supplementaryResource = resources.find(r => r.type === '4');
        if (supplementaryResource?.fileUrl) {
          try {
            Toast.loading({ message: '加载中...', duration: 0 });
            const response = await fetch(supplementaryResource.fileUrl);
            const text = await response.text();
            Toast.clear();
            setVoiceModalInitialContent(text);
          } catch (error) {
            Toast.clear();
            console.error('Failed to load supplementary text:', error);
            setVoiceModalInitialContent('');
          }
        } else {
          setVoiceModalInitialContent('');
        }
        setVoiceModalVisible(true);
        break;
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    if (!dealId) {
      Toast.fail('未找到尽调实例');
      return;
    }

    const file = files[0];
    try {
      Toast.loading({ message: '上传中...', duration: 0 });
      const res = await dealService.uploadDealMaterial(dealId, file);
      Toast.clear();

      if (res.success) {
        Toast.success('上传成功');
        // 刷新资料列表
        fetchDealDetail();
      } else {
        Toast.fail(res.message || '上传失败');
      }
    } catch (error) {
      Toast.clear();
      console.error('Upload failed:', error);
      Toast.fail('上传失败');
    }
    
    // 清空 input 以便再次选择同一文件
    e.target.value = '';
  };

  // 删除资料
  // 删除资料
  const handleDeleteResource = async (resourceId: string) => {
    if (!dealId) {
      Toast.fail('未找到尽调实例');
      return;
    }

    Dialog.confirm({
      title: '确认删除',
      message: '确定要删除该资料吗？此操作无法撤销。',
      confirmButtonColor: '#FA5151',
    })
      .then(async () => {
        try {
          Toast.loading({ message: '删除中...', duration: 0 });
          const res = await dealService.deleteDealMaterial(dealId, resourceId);
          Toast.clear();

          if (res.success) {
            Toast.success('删除成功');
            // 刷新资料列表
            fetchDealDetail();
          } else {
            Toast.fail(res.message || '删除失败');
          }
        } catch (error) {
          Toast.clear();
          console.error('Delete failed:', error);
          Toast.fail('删除失败');
        }
      })
      .catch(() => {});
  };

  const handleDeleteResourceThrottled = useThrottleFn(handleDeleteResource, 1000);

  // 打开重命名弹框
  const handleOpenRenameModal = (resource: Resource) => {
    if (!resource.fileName) {
      Toast.fail('文件名不存在');
      return;
    }
    // 提取文件名（不含后缀）
    const nameParts = resource.fileName.split('.');
    if (nameParts.length > 1) nameParts.pop(); // 移除后缀
    const baseName = nameParts.join('.');
    
    setRenameTarget(resource);
    setNewFileName(baseName);
    setRenameModalVisible(true);
  };

  // 确认重命名
  const handleConfirmRename = async () => {
    if (!renameTarget) {
      Toast.fail('参数错误');
      return;
    }

    if (!newFileName.trim()) {
      Toast.fail('文件名不能为空');
      return;
    }

    if (!renameTarget.fileName) {
      Toast.fail('原文件名不存在');
      return;
    }

    // 获取原文件后缀
    const nameParts = renameTarget.fileName.split('.');
    const ext = nameParts.length > 1 ? nameParts.pop() : '';
    const fullNewName = ext ? `${newFileName.trim()}.${ext}` : newFileName.trim();

    try {
      Toast.loading({ message: '重命名中...', duration: 0 });
      const res = await dealService.renameDealMaterial(renameTarget.id, fullNewName);
      Toast.clear();

      if (res.success) {
        Toast.success('重命名成功');
        setRenameModalVisible(false);
        setRenameTarget(null);
        // 刷新资料列表
        fetchDealDetail();
      } else {
        Toast.fail(res.message || '重命名失败');
      }
    } catch (error) {
      Toast.clear();
      console.error('Rename failed:', error);
      Toast.fail('重命名失败');
    }
  };

  // 根据文件类型获取图标图片路径
  // 支持6种类型：excel、word、pdf、txt、ppt、image
  const getFileIconSrc = (fileName: string | undefined): string => {
    const ext = fileName?.split('.').pop()?.toLowerCase() || '';
    if (['xlsx', 'xls', 'csv'].includes(ext)) {
      return `${basePath}assets/excel.png`;
    } else if (['doc', 'docx'].includes(ext)) {
      return `${basePath}assets/word.png`;
    } else if (['pdf'].includes(ext)) {
      return `${basePath}assets/pdf.png`;
    } else if (['txt', 'text'].includes(ext)) {
      return `${basePath}assets/txt.png`;
    } else if (['ppt', 'pptx'].includes(ext)) {
      return `${basePath}assets/ppt.png`;
    } else if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(ext)) {
      return `${basePath}assets/image.png`;
    }
    // 默认使用 txt 图标
    return `${basePath}assets/txt.png`;
  };

  // 处理生成报告点击
  const handleGenerateClick = () => {
    const isRegenerate = localReportStatus === DealReportStatusEnum.REPORT_GENERATED;
    
    Dialog.confirm({
      title: isRegenerate ? '确认重新生成报告？' : '确认立即生成报告？',
      message: isRegenerate 
        ? '是否确认根据当前尽调资料和访谈录音重新生成报告？原有报告内容将被覆盖'
        : '系统将根据当前尽调资料、访谈录音和报告模板生成尽调报告',
      confirmButtonText: '确认',
      cancelButtonText: '取消',
      confirmButtonColor: '#4337F1',
      className: 'report-confirm-dialog',
    })
    .then(async () => {
      if (!dealId) {
        Toast.fail('尽调ID不存在');
        return;
      }

      // 检查访谈记录和补充资料是否都为空
      if (!hasInterviewRecords && resources.length === 0) {
        setTimeout(() => {
          Toast.fail({ message: '访谈记录和补充资料不能同时为空，请先添加内容', duration: 3000 });
        }, 100);
        return;
      }
      
      try {
        Toast.loading({ message: '请求生成中...', duration: 0, forbidClick: true });
        const res = await dealService.generateInterviewInstReportAsync(dealId);
        Toast.clear();
        
        if (res.success) {
          Toast.success('已开始生成报告');
          // 跳转回尽调详情界面
          handleBackWithSummary();
        } else {
          setTimeout(() => {
            Toast.fail({ message: res.message || '生成请求失败', duration: 3000 });
          }, 100);
        }
      } catch (error) {
        Toast.clear();
        console.error('Generate report failed:', error);
        setTimeout(() => {
          Toast.fail({ message: '生成请求失败', duration: 3000 });
        }, 100);
      }
    })
    .catch(() => {
      // 取消操作
    });
  };

  const uploadOptions = [
    { id: 'camera' as const, label: '相机', icon: Camera },
    { id: 'gallery' as const, label: '相册', icon: ImageIcon },
    { id: 'file' as const, label: '文件', icon: FileText },
    { id: 'voice' as const, label: '语音录入', icon: Mic },
  ];

  return (
    <div className="flex flex-col h-full bg-white">
      {/* 隐藏的文件输入框 */}
      <input 
        type="file" 
        ref={cameraInputRef} 
        accept="image/*" 
        capture="environment" 
        className="hidden" 
        onChange={handleFileChange}
      />
      <input 
        type="file" 
        ref={galleryInputRef} 
        accept="image/*" 
        className="hidden" 
        onChange={handleFileChange}
      />
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        onChange={handleFileChange}
      />

      {/* NavBar */}
      <div className="flex items-center justify-center px-4 py-3 relative border-b border-gray-100">
        <button 
          onClick={handleBackWithSummary} 
          className="absolute left-4 p-2 text-slate-700 hover:bg-slate-50 rounded-full active:bg-slate-100 transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-lg font-semibold text-slate-800">尽调资料</h1>
      </div>

      {/* Upload Options Grid */}
      {/* Upload Options Grid - Hide if archived */}
      {!isArchived && (
        <div className="px-6 pt-6">
          <div className="grid grid-cols-4 gap-4">
            {uploadOptions.map((option) => (
              <button 
                key={option.id}
                onClick={() => handleUploadClick(option.id)}
                className="flex flex-col items-center gap-2 active:scale-95 transition-transform"
              >
                <div className="w-14 h-14 rounded-2xl bg-[#F7F8FA] flex items-center justify-center text-indigo-500 shadow-sm border border-indigo-50/50">
                  <option.icon size={26} strokeWidth={1.5} />
                </div>
                <span className="text-xs font-medium text-slate-600">{option.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Resource List or Empty State */}
      {resources.length > 0 ? (
        <div className="flex-1 overflow-y-auto px-6 pb-24 mt-2">
          <div className="divide-y divide-gray-100">
            {resources.map((resource) => {
              const iconSrc = getFileIconSrc(resource.fileName);
              return (
                <div 
                  key={resource.id} 
                  className="flex items-center py-4 gap-3"
                  style={{ paddingLeft: '0.46rem' }}
                >
                  {/* File Icon */}
                  <div className="w-10 h-10 flex-shrink-0">
                    <img 
                      src={iconSrc} 
                      alt="file icon" 
                      className="w-full h-full object-contain"
                    />
                  </div>
                  
                  {/* File Name - Clickable for Preview */}
                  <button
                    onClick={async () => {
                      // 如果是补充资料（type=4），从fileUrl获取文本内容后打开弹框
                      if (resource.type === '4') {
                        try {
                          if (resource.fileUrl) {
                            Toast.loading({ message: '加载中...', duration: 0 });
                            const response = await fetch(resource.fileUrl);
                            const text = await response.text();
                            Toast.clear();
                            setVoiceModalInitialContent(text);
                            setVoiceModalVisible(true);
                          } else {
                            Toast.fail('补充资料链接不存在');
                          }
                        } catch (error) {
                          Toast.clear();
                          console.error('Failed to fetch supplementary text:', error);
                          Toast.fail('加载补充资料失败');
                        }
                        return;
                      }
                      
                      // 普通文件，预览
                      if (resource.fileUrl) {
                        if (onPreviewFile) {
                          onPreviewFile(resource.fileName, resource.fileUrl, resource.id);
                        } else {
                          window.open(resource.fileUrl, '_blank');
                        }
                      } else {
                        Toast.info('暂无预览链接');
                      }
                    }}
                    className="flex-1 text-sm text-slate-800 truncate text-left hover:text-indigo-600 transition-colors active:scale-[0.98]"
                  >
                    {resource.fileName}
                  </button>
                  
                  {/* Actions - Hide if archived */}
                  {!isArchived && (
                    <div className="flex items-center gap-1">
                      {/* Edit Button - Hide for supplementary (type=4) */}
                      {resource.type !== '4' && (
                        <button 
                          onClick={() => handleOpenRenameModal(resource)}
                          className="p-2 text-indigo-400 hover:text-indigo-600 transition-colors"
                        >
                          <Pencil size={18} strokeWidth={2} />
                        </button>
                      )}
                      
                      {/* Delete Button - Show for all including supplementary */}
                      <button 
                        onClick={() => handleDeleteResourceThrottled(resource.id)}
                        className="p-2 text-indigo-400 hover:text-red-500 transition-colors"
                      >
                        <MinusCircle size={22} strokeWidth={2} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {/* 底部占位，防止遮挡最后一条 */}
          <div style={{ height: 120, flexShrink: 0 }} />
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center px-6 pb-24">
          {/* Mascot Illustration */}
          <div className="relative mb-3 flex items-center justify-center">
            <Mascot size="medium" />
          </div>

          {/* Text */}
          <p className="text-sm text-gray-400 text-center">小狸等你上传资料哦</p>
        </div>
      )}

      {/* Fixed Bottom Button - Hide if archived */}
      {!isArchived && (
        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto px-4 pb-6 z-30">
          <button
            onClick={handleGenerateClick}
            className="w-full h-12 rounded-full font-bold text-lg transition-transform flex items-center justify-center gap-2 bg-[#4337F1] text-white shadow-lg active:scale-95"
          >
            {localReportStatus === DealReportStatusEnum.REPORT_GENERATED ? (
              <>
                <RefreshCw size={18} strokeWidth={2.5} />
                重新生成报告
              </>
            ) : (
              <>→ 立即生成报告</>
            )}
          </button>
        </div>
      )}

      {/* Voice Input Modal */}
      <VoiceInputModal
        visible={voiceModalVisible}
        dealId={dealId}
        initialContent={voiceModalInitialContent}
        readOnly={isArchived}
        onClose={() => {
          setVoiceModalVisible(false);
          setVoiceModalInitialContent(''); // 清空初始内容
        }}
        onSave={async (content) => {
          console.log('Voice input content saved:', content);
          // 刷新资料列表
          await fetchDealDetail();
        }}
      />

      {/* Rename Modal */}
      {renameModalVisible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/40"
            onClick={() => setRenameModalVisible(false)}
          />
          
          {/* Modal Content */}
          <div className="relative bg-white rounded-2xl w-[85%] max-w-sm p-6 shadow-xl">
            <h3 className="text-center text-lg font-bold text-slate-800 mb-6">文件重命名</h3>
            
            {/* Input */}
            <div className="relative mb-8">
              <input
                type="text"
                value={newFileName}
                onChange={(e) => {
                  let val = e.target.value;
                  // 1. 限制最大长度 30
                  if (val.length > 30) {
                    val = val.slice(0, 30);
                  }
                  // 2. 过滤特殊字符: \ | / ? * < > 、连续的点 .. 
                  val = val.replace(/([\\\|\/\?\*\<\>]|\.\.)/g, '');
                  setNewFileName(val);
                }}
                maxLength={30}
                className="w-full px-4 py-3 text-base text-slate-800 border border-gray-200 rounded-full focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
                placeholder="请输入文件名"
              />
            </div>
            
            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setRenameModalVisible(false)}
                className="flex-1 py-3 text-base font-medium text-slate-600 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleConfirmRename}
                className="flex-1 py-3 text-base font-medium text-white rounded-full active:scale-95 transition-all bg-confirm-gradient"
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaterialsListPage;
