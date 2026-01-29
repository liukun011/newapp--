import React, { useState, useEffect } from 'react';
import { useThrottleFn } from '../hooks/useThrottleFn';
import { ArrowLeft, Pencil, Mic, ChevronRight, FilePlus, Camera, Image as ImageIcon, FileText, Archive } from 'lucide-react';
import { Toast, Dialog } from 'react-vant';
import Mascot from '../components/Mascot';
import { COLORS } from '../constants';
import { DealRecord, DealReportStatusEnum, Resource } from '../types';
import { dealService } from '../services/dealService';
import { nativeBridge } from '@/services/nativeBridge';
import { useRecordingStore } from '../store/useRecordingStore';
import VoiceInputModal from '../components/VoiceInputModal';

interface DueDiligencePageProps {
  deal: DealRecord | null;
  onBack: () => void;
  onNavigateToRecording: () => void;
  onNavigateToMaterials: () => void;
  onNavigateToQuestions?: () => void;
  onEditInfo?: () => void;
  onChangeTemplate?: () => void;
  onPreviewReport?: (name: string, reportUrl: string, previewUrl: string, showDownloadButton?: boolean) => void;
  onNavigateToHistory?: (dealId: string) => void;
  onDealDetailLoaded?: (detail: DealRecord) => void;
}

const DueDiligencePage: React.FC<DueDiligencePageProps> = ({ 
  deal,
  onBack, 
  onNavigateToRecording,
  onNavigateToMaterials,
  onNavigateToQuestions,
  onEditInfo,
  onChangeTemplate,
  onPreviewReport,
  onNavigateToHistory,
  onDealDetailLoaded
}) => {
  const basePath = import.meta.env.BASE_URL || '/';
  // 详情数据
  const [dealDetail, setDealDetail] = useState<DealRecord | null>(null);
  
  // 使用 ref 保存回调，避免依赖变化导致重复请求
  const onDealDetailLoadedRef = React.useRef(onDealDetailLoaded);
  onDealDetailLoadedRef.current = onDealDetailLoaded;

  const { currentDealId } = useRecordingStore();
  const [showLimitTips, setShowLimitTips] = useState(false);
  const [voiceModalVisible, setVoiceModalVisible] = useState(false);
  const [voiceModalInitialContent, setVoiceModalInitialContent] = useState('');
  
  // 上传状态锁，防止重复触发
  const isUploadingRef = React.useRef(false);

  // 进入页面时请求详情（只在 deal.id 变化时请求）
  useEffect(() => {
    const fetchDealDetail = async () => {
      if (!deal?.id) return;
      
      try {
        const res = await dealService.getDealInstDetail(deal.id);
        if (res.success && res.data) {
          setDealDetail(res.data);
          // 通知父组件更新数据
          onDealDetailLoadedRef.current?.(res.data);
        }
      } catch (error) {
        console.error('Failed to fetch deal detail:', error);
      }
    };
    
    fetchDealDetail();
  }, [deal?.id]);

  // 使用详情数据，如果没有则使用传入的 deal
  const currentDeal = dealDetail || deal;
  const isFinishedInterview = currentDeal?.status === '4';

  // 轮询检查报告生成状态
  useEffect(() => {
    // 只有当报告状态为"生成中"时才启动轮询
    if (currentDeal?.reportStatus != DealReportStatusEnum.REPORT_GENERATING || !currentDeal?.id) {
      return;
    }

    const pollInterval = setInterval(async () => {
      try {
        const res = await dealService.getDealInstDetail(currentDeal.id);
        if (res.success && res.data) {
          setDealDetail(res.data);
          onDealDetailLoadedRef.current?.(res.data);
          
          // 如果状态不再是"生成中"，停止轮询
          if (res.data.reportStatus != DealReportStatusEnum.REPORT_GENERATING) {
            clearInterval(pollInterval);
          }
        }
      } catch (error) {
        console.error('Failed to poll deal detail:', error);
      }
    }, 5000); // 每 5 秒轮询一次

    // 清理函数
    return () => {
      clearInterval(pollInterval);
    };
  }, [currentDeal?.reportStatus, currentDeal?.id]);

  // 引用隐藏的 input 元素
  const cameraInputRef = React.useRef<HTMLInputElement>(null);
  const galleryInputRef = React.useRef<HTMLInputElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);


  // 监听原生文件选择回调 (及 Android ImageSelected) - 从 MaterialsListPage 迁移过来的完整逻辑
  useEffect(() => {
    // Android Image Upload Flow
    const handleNativeImageUpload = async (localUrl: string) => {
      if (!deal?.id) return;
      if (isUploadingRef.current) return; // 防止重复触发
      
      isUploadingRef.current = true;
      try {
        Toast.loading({ message: '上传中...', duration: 0, forbidClick: true });
        
        // 1. 调用 Native 上传文件到 MinIO/OBS
        const token = localStorage.getItem('zov-user-token') || '';
        const uploadHost = 'http://68.79.42.215/report/upload/file'; // 硬编码

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
        const bindRes = await dealService.uploadDealResource(deal.id, [serverUrl]);
        
        Toast.clear();
        if (bindRes.success) {
          Toast.success('上传成功');
          // 刷新详情
          const detailRes = await dealService.getDealInstDetail(deal.id);
          if (detailRes.success && detailRes.data) {
             setDealDetail(detailRes.data);
             onDealDetailLoadedRef.current?.(detailRes.data);
          }
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
             console.log('[DueDiligencePage] 收到文件选择回调:', path);
             handleNativeImageUpload(path);
        } else {
             console.warn('[DueDiligencePage] 文件选择回调数据格式不匹配:', JSON.stringify(res));
        }
    };
    nativeBridge.on('fileSelected', handleFileSelected);



    return () => {
      nativeBridge.off('imageSelected', handleImageSelected);
      nativeBridge.off('fileSelected', handleFileSelected);
    };
  }, [deal?.id]);
  
  // 辅助函数：直接上传 File 对象
  const handleUploadFileDirectly = async (dealId: string, file: File) => {
      try {
        Toast.loading({ message: '上传中...', duration: 0 });
        const res = await dealService.uploadDealMaterial(dealId, file);
        Toast.clear();
        if (res.success) {
          Toast.success('上传成功');
           // 刷新详情
           const detailRes = await dealService.getDealInstDetail(dealId);
           if (detailRes.success && detailRes.data) {
             setDealDetail(detailRes.data);
             onDealDetailLoadedRef.current?.(detailRes.data);
          }
        } else {
          Toast.fail(res.message || '上传失败');
        }
      } catch (error) {
        Toast.clear();
        console.error('Upload failed:', error);
        Toast.fail('上传失败');
      }
  };



  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    if (!deal?.id) {
      Toast.fail('未找到尽调实例');
      return;
    }

    const file = files[0];
    handleUploadFileDirectly(deal.id, file);
    
    // 清空 input 以便再次选择同一文件
    e.target.value = '';
  };

  const uploadOptions = [
    { id: 'camera', label: '相机', icon: Camera },
    { id: 'gallery', label: '相册', icon: ImageIcon },
    { id: 'file', label: '文件', icon: FileText },
    { id: 'voice', label: '语音录入', icon: Mic },
  ];

  const handleUploadClick = async (id: string) => {
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
        // 检查是否已有补充文本 (type='4')
        const resources = dealDetail?.resources || [];
        // 也需要合并 supplementary 字段
        let allResources = [...resources];
        if (dealDetail?.supplementary && Array.isArray(dealDetail.supplementary)) {
             allResources.unshift(...(dealDetail.supplementary as Resource[]));
        }

        const supplementaryResource = allResources.find(r => r.type === '4');
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

  // Throttled Handlers
  const handleUploadClickThrottled = useThrottleFn(handleUploadClick, 1000);
  
  const handleBackThrottled = useThrottleFn(onBack, 1000);
  const handleEditInfoThrottled = useThrottleFn(() => onEditInfo?.(), 1000);
  const handleNavigateMaterialsThrottled = useThrottleFn(onNavigateToMaterials, 1000);
  const handleNavigateQuestionsThrottled = useThrottleFn(() => onNavigateToQuestions?.(), 1000);

  const handleReportPreviewThrottled = useThrottleFn(async () => {
    if (currentDeal?.report?.id && currentDeal?.report?.fileUrl) {
      try {
        console.log('[Report Preview] Calling API with:', {
          fileId: currentDeal.report.id,
          fileUrl: currentDeal.report.fileUrl
        });
        
        Toast.loading({ message: '正在打开报告...', duration: 0, forbidClick: true });
        const res = await dealService.viewReportUrl(currentDeal.report.id, currentDeal.report.fileUrl);
        
        console.log('[Report Preview] API response:', res);
        Toast.clear();
        
        if (res.success && res.data) {
          // 尽调报告卡片点击：仅查看，不显示下载按钮
          onPreviewReport?.(
            currentDeal.report.fileName || '尽调报告',
            currentDeal.report.fileUrl,
            res.data,
            false 
          );
        } else {
          Toast.fail(res.message || '打开报告失败');
        }
      } catch (error) {
        Toast.clear();
        console.error('View report failed:', error);
        Toast.fail('打开报告失败');
      }
    } else {
      Toast.fail('报告信息不完整');
    }
  }, 1000);

  const handleDownloadReportThrottled = useThrottleFn(async () => {
    if (currentDeal?.report?.id && currentDeal?.report?.fileUrl) {
      try {
        Toast.loading({ message: '正在打开下载页...', duration: 0, forbidClick: true });
        const res = await dealService.viewReportUrl(currentDeal.report.id, currentDeal.report.fileUrl);
        Toast.clear();
        
        if (res.success && res.data) {
          // 立即下载按钮点击：进入预览页，且底部显示“立即下载”按钮
          onPreviewReport?.(
            currentDeal.report.fileName || '尽调报告',
            currentDeal.report.fileUrl,
            res.data,
            true 
          );
        } else {
          Toast.fail(res.message || '打开失败');
        }
      } catch (error) {
        Toast.clear();
        console.error('View report failed:', error);
        Toast.fail('打开失败');
      }
    } else {
      Toast.fail('报告文件不存在');
    }
  }, 1000);

  const handleGenerateReportThrottled = useThrottleFn(() => {
    Dialog.confirm({
      title: '确认生成',
      message: '重新生成报告将覆盖现有报告，是否继续?',
    }).then(async () => {
      if (!currentDeal?.id) {
        Toast.fail('尽调信息不存在');
        return;
      }

      // 检查访谈记录和补充资料是否都为空
      const hasInterviewRecords = currentDeal.interviewInstList && currentDeal.interviewInstList.length > 0;
      const hasSupplementaryMaterials = currentDeal.resources && currentDeal.resources.length > 0;

      if (!hasInterviewRecords && !hasSupplementaryMaterials) {
        Toast.fail('访谈记录和补充资料不能同时为空，请先添加内容');
        return;
      }

      try {
        Toast.loading({ message: '正在生成报告...', duration: 0, forbidClick: true });
        const res = await dealService.generateInterviewInstReportAsync(currentDeal.id);
        Toast.clear();
        
        if (res.success) {
          Toast.success('报告生成任务已提交');
          try {
            const detailRes = await dealService.getDealInstDetail(currentDeal.id);
            if (detailRes.success && detailRes.data) {
              setDealDetail(detailRes.data);
              onDealDetailLoadedRef.current?.(detailRes.data);
            }
          } catch (error) {
            console.error('Failed to refresh deal detail:', error);
          }
        } else {
          Toast.fail(res.message || '生成报告失败');
        }
      } catch (error) {
        Toast.clear();
        console.error('Generate report failed:', error);
        Toast.fail('生成报告失败');
      }
    }).catch(() => {});
  }, 1000);

  const handleChangeTemplateThrottled = useThrottleFn(() => onChangeTemplate?.(), 1000);
  
  const handleRecordingClickThrottled = useThrottleFn(() => {
     // 检查是否已归档
     if (currentDeal?.status === '5') {
       if (onNavigateToHistory && currentDeal?.id) {
         onNavigateToHistory(currentDeal.id);
       }
       return;
     }
     console.log('currentDealId', currentDealId);
     console.log('currentDeal', currentDeal);
     // 校验是否有正在进行的访谈（悬浮窗存在 即 currentDealId 不为空）
     if (currentDealId && currentDealId !== currentDeal?.id) {
       setShowLimitTips(true);
       setTimeout(() => setShowLimitTips(false), 3000);
       return;
     }

     onNavigateToRecording();
  }, 1000);

  const handleArchiveThrottled = useThrottleFn(() => {
    Dialog.confirm({
      title: '提示',
      message: '请确认所有访谈工作已完成。归档后仅支持查看和导出报告，不再支持编辑。',
      cancelButtonText: '暂不归档',
      confirmButtonText: '确认归档',
      confirmButtonColor: '#4E3EF8',
    }).then(async () => {
      if (!currentDeal?.id) {
        Toast.fail('尽调信息不存在');
        return;
      }

      try {
        Toast.loading({ message: '归档中...', duration: 0, forbidClick: true });
        const res = await dealService.archiveDeal(currentDeal.id);
        Toast.clear();
        
        if (res.success) {
           Toast.success('归档成功');
           // 刷新详情
           const detailRes = await dealService.getDealInstDetail(currentDeal.id);
           if (detailRes.success && detailRes.data) {
             setDealDetail(detailRes.data);
             onDealDetailLoadedRef.current?.(detailRes.data);
           }
        } else {
          Toast.fail(res.message || '归档失败');
        }
      } catch (error) {
        Toast.clear();
        console.error('Archive failed:', error);
        Toast.fail('归档失败');
      }
    }).catch(() => {
      // 取消归档
    });
  }, 1000);
  return (
    <div className="flex flex-col min-h-screen bg-[#F7F8FA] relative">
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

      {/* Background Gradient for Top Section */}
      <div 
        className="absolute top-0 left-0 right-0 h-[400px] z-0 pointer-events-none"
        style={{
          background: `linear-gradient(180deg, ${COLORS.backgroundStart} 0%, rgba(247,248,250,0) 100%)`
        }}
      />

      {/* NavBar */}
      <div className="relative z-10 flex items-center justify-between px-4 py-3">
        {/* Custom Limit Tips Toast */}
        {showLimitTips && (
           <div className="fixed top-24 left-4 right-4 z-50 animate-[slideDown_0.3s_ease-out_forwards] flex justify-center">
             <div className="bg-black/30 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-2">
               <span className="text-sm font-medium tracking-wide">
                 您正有一个访谈正在进行中，暂时不支持开启新任务。
               </span>
             </div>
           </div>
        )}
        <button onClick={handleBackThrottled} className="p-2 -ml-2 text-slate-700 hover:bg-white/50 rounded-full">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-lg font-bold text-slate-800">{currentDeal?.interviewCust || '尽调详情'}</h1>
        {currentDeal?.status === '5' ? (
          <div className="w-9" />
        ) : (
          <button 
            onClick={handleEditInfoThrottled}
            className="p-2 -mr-2 text-slate-700 hover:bg-white/50 rounded-full"
          >
            <Pencil size={20} />
          </button>
        )}
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-24 relative z-10 space-y-4">
        
        {/* Status Bar / Mascot Message */}
        <div className="flex items-end mt-2 mb-4 relative">
          <div className="w-16 h-16 mr-3 flex-shrink-0 relative z-20">
            <Mascot size="small" />
          </div>
          
          <div className="bg-white rounded-tr-2xl rounded-br-2xl rounded-bl-2xl p-3 shadow-sm relative z-10 flex-1 mb-2">
            <p className="text-sm text-slate-700 font-medium">
              {(currentDeal?.status === '5')
                ? '访谈归档，内容仅供查阅和下载'
                : currentDeal?.reportStatus == DealReportStatusEnum.REPORT_GENERATING
                  ? '小狸全速生成报告中，请稍候'
                  : currentDeal?.reportStatus == DealReportStatusEnum.REPORT_GENERATED
                    ? '报告已生成! 可以继续完善信息'
                    : isFinishedInterview 
                      ? '本次访谈已完成，可查看历史记录或生成报告' 
                      : '记录创建成功，赶紧开始访谈吧...'}
            </p>
          </div>
        </div>

        {/* Advice Card - 暂时隐藏，后续开放 */}
        {/* <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h2 className="text-slate-900 font-bold text-[16px] mb-3">尽调建议</h2>
          <p className="text-slate-600 text-sm leading-relaxed text-justify">
            A公司2024年营收显著下滑，建议深入考察其经营层面。上传流水，可获更详尽的专项分析。
          </p>
        </div> */}

        {/* Report Card */}
        {currentDeal?.reportStatus == DealReportStatusEnum.REPORT_GENERATED ? (
          // 报告已生成 - 卡片和按钮合并布局
          <div className="rounded-3xl shadow-lg overflow-hidden">
            {/* 上半部分 - 报告信息 */}
            <div 
              className="rounded-t-3xl p-5 relative overflow-hidden text-white cursor-pointer active:opacity-90 transition-opacity" 
              style={{ background: 'linear-gradient(135deg, #4E3EF8 0%, #7062ff 100%)' }}
              onClick={handleReportPreviewThrottled}
            >
              <div className="relative z-10 max-w-[65%]">
                <h2 className="text-xl font-bold mb-1.5">
                  尽调报告
                </h2>
                <p className="text-white text-xs mb-2 font-light">访谈既报告，洞察更高效。小狸智能捕捉核心要点。</p>
              </div>

              {/* Rocket Mascot Image */}
              <div className="absolute right-1 top-1/2 -translate-y-1/2 mt-0 w-36 h-36">
                <img 
                   src={`${basePath}assets/rocketxiaoli.png`}
                   alt="Rocket Mascot"
                   className="w-full h-full object-contain drop-shadow-2xl"
                />
              </div>
              {/* Decorative circles */}
              <div className="absolute top-[-20px] right-[-20px] w-20 h-20 bg-white/10 rounded-full blur-xl" />
              <div className="absolute bottom-[-10px] left-[30%] w-16 h-16 bg-white/10 rounded-full blur-lg" />
            </div>

            {/* 下半部分 - 按钮区域 */}
            <div className="bg-[#5047E9] px-2 py-2 relative z-10 flex justify-end gap-2 items-center" style={{ minHeight: '52px' }}>
                {(currentDeal?.status === '5') ? (
                  // 已归档状态：仅显示立即下载
                  <button 
                    onClick={handleDownloadReportThrottled}
                    className="px-6 py-2 bg-transparent border border-white/40 text-white rounded-full text-sm font-medium active:scale-95 transition-transform whitespace-nowrap"
                  >
                    立即下载
                  </button>
                ) : (
                  // 未归档状态：显示完整功能
                  <>
                    <button
                      onClick={handleGenerateReportThrottled}
                      className="px-3 py-2 bg-white text-indigo-600 rounded-full text-sm font-bold shadow-md active:scale-95 transition-transform whitespace-nowrap"
                    >
                      立即生成
                    </button>
                    <button 
                      onClick={handleDownloadReportThrottled}
                      className="px-3 py-2 bg-transparent border border-white/40 text-white rounded-full text-sm font-medium active:scale-95 transition-transform whitespace-nowrap"
                    >
                      立即下载
                    </button>
                    <button 
                      className="px-3 py-2 bg-transparent border border-white/40 text-white rounded-full text-sm font-medium active:scale-95 transition-transform whitespace-nowrap"
                      onClick={handleChangeTemplateThrottled}
                    >
                      更换模板
                    </button>
                  </>
                )}
              </div>
          </div>
        ) : (
          // 其他状态 - 原来的卡片样式
          <div className="rounded-3xl p-5 shadow-lg relative overflow-hidden text-white" 
               style={{ background: 'linear-gradient(135deg, #4E3EF8 0%, #7062ff 100%)' }}>
            <div className="relative z-10 max-w-[65%]">
              <h2 className="text-xl font-bold mb-1.5">尽调报告</h2>
              <p className="text-white text-xs mb-4 font-light">访谈既报告，洞察更高效。小狸智能捕捉核心要点。</p>
              
              {currentDeal?.reportStatus == DealReportStatusEnum.REPORT_GENERATING ? (
                // 报告生成中 - 显示 loading
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm font-medium">报告正在后台生成...</span>
                </div>
              ) : (
                // 未生成状态 - 显示两个按钮
                <div className="flex gap-3">
                  <button 
                    onClick={() => {
                      Dialog.confirm({
                        title: '确认生成报告?',
                        message: '系统将根据当前尽调资料、访谈录音和报告模板生成尽调报告',
                        confirmButtonText: '确认',
                        cancelButtonText: '取消',
                        confirmButtonColor: '#4E3EF8',
                      }).then(async () => {
                        if (!currentDeal?.id) {
                          Toast.fail('尽调信息不存在');
                          return;
                        }

                        // 检查访谈记录和补充资料是否都为空
                        const hasInterviewRecords = currentDeal.interviewInstList && currentDeal.interviewInstList.length > 0;
                        const hasSupplementaryMaterials = currentDeal.resources && currentDeal.resources.length > 0;

                        if (!hasInterviewRecords && !hasSupplementaryMaterials) {
                          Toast.fail('访谈记录和补充资料不能同时为空，请先添加内容');
                          return;
                        }

                        try {
                          Toast.loading({ message: '正在生成报告...', duration: 0, forbidClick: true });
                          const res = await dealService.generateInterviewInstReportAsync(currentDeal.id);
                          Toast.clear();
                          
                          if (res.success) {
                            Toast.success('报告生成任务已提交');
                            
                            // 刷新尽调详情以获取最新的 reportStatus
                            try {
                              const detailRes = await dealService.getDealInstDetail(currentDeal.id);
                              if (detailRes.success && detailRes.data) {
                                setDealDetail(detailRes.data);
                                onDealDetailLoadedRef.current?.(detailRes.data);
                              }
                            } catch (error) {
                              console.error('Failed to refresh deal detail:', error);
                            }
                          } else {
                            Toast.fail(res.message || '生成报告失败');
                          }
                        } catch (error) {
                          Toast.clear();
                          console.error('Generate report failed:', error);
                          Toast.fail('生成报告失败');
                        }
                      }).catch(() => {
                        // 用户取消
                      });
                    }}
                    className="px-4 py-2 bg-white text-indigo-600 rounded-full text-sm font-bold shadow-md active:scale-95 transition-transform whitespace-nowrap"
                  >
                    立即生成
                  </button>
                  <button 
                    className="px-4 py-2 bg-transparent border border-white/40 text-white rounded-full text-sm font-medium hover:bg-white/10 active:scale-95 transition-transform whitespace-nowrap"
                    onClick={handleChangeTemplateThrottled}
                  >
                    更换模板
                  </button>
                </div>
              )}
            </div>

            {/* Rocket Mascot Image */}
            <div className="absolute right-1 top-1/2 -translate-y-1/2 mt-[20px] w-36 h-36">
              <img 
                 src={`${basePath}assets/rocketxiaoli.png`}
                 alt="Rocket Mascot"
                 className="w-full h-full object-contain drop-shadow-2xl"
              />
            </div>
            {/* Decorative circles */}
            <div className="absolute top-[-20px] right-[-20px] w-20 h-20 bg-white/10 rounded-full blur-xl" />
            <div className="absolute bottom-[-10px] left-[30%] w-16 h-16 bg-white/10 rounded-full blur-lg" />
          </div>
        )}

        {/* Action Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Materials */}
          <div 
            className="bg-white rounded-2xl p-4 shadow-sm flex flex-col justify-between min-h-[140px] cursor-pointer active:scale-[0.98] transition-all"
            onClick={handleNavigateMaterialsThrottled}
          >
            <div>
               <h3 className="font-bold text-slate-800 text-[16px]">尽调资料</h3>
               <p className="text-xs text-gray-400 mt-1">AI智能解析</p>
            </div>
            
            <div className="flex items-center justify-between mt-4">
               <div className="flex gap-2">
                 {(currentDeal?.status === '5') ? (
                   // 已归档状态：显示立即查看按钮
                   <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNavigateMaterialsThrottled();
                    }}
                    className="px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold border border-indigo-100"
                   >
                     立即查看
                   </button>
                 ) : (
                   // 未归档状态：显示上传图标
                   uploadOptions.map(opt => (
                     <button 
                      key={opt.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUploadClickThrottled(opt.id);
                      }}
                      className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-slate-500 active:bg-gray-100 transition-colors"
                     >
                       <opt.icon size={16} strokeWidth={2} />
                     </button>
                   ))
                 )}
               </div>
               <FilePlus className="text-gray-300 w-8 h-8 opacity-50" strokeWidth={1.5} />
            </div>
          </div>

          {/* Recording */}
          <div className="bg-white rounded-2xl p-4 shadow-sm flex flex-col justify-between min-h-[140px]">
             <div>
               <h3 className="font-bold text-slate-800 text-[16px]">访谈录音</h3>
               <p className="text-xs text-gray-400 mt-1">AI智能转写</p>
            </div>

            <div className="flex items-end justify-between mt-4">
               <button 
                onClick={handleRecordingClickThrottled}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border ${
                  currentDeal?.status === '5'
                    ? 'bg-indigo-50 text-indigo-600 border-indigo-100' // 恢复高亮样式
                    : 'bg-indigo-50 text-indigo-600 border-indigo-100'
                } whitespace-nowrap`}
               >
                 {(currentDeal?.status === '5') ? '历史访谈' : '+访谈录音'}
               </button>
               <Mic className="text-indigo-200 w-10 h-10" strokeWidth={1.5} />
            </div>
          </div>
        </div>

        {/* Questions Cell */}
        {(() => {
          const questionList = currentDeal?.questionInfoList || [];
          const totalCount = questionList.length;
          const checkedCount = questionList.filter((q) => q.CHECKED === true).length;
          return (
            <div 
              className="bg-white rounded-2xl p-5 shadow-sm flex items-center justify-between active:bg-gray-50 transition-colors cursor-pointer"
              onClick={handleNavigateQuestionsThrottled}
            >
              <span className="font-bold text-slate-800">问题集合 {checkedCount}/{totalCount}</span>
              <ChevronRight className="text-gray-300" size={20} />
            </div>
          );
        })()}

      </div>

      {/* Fixed Archive Button at Bottom */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto px-4 pb-6 z-30">
        <button
          disabled={currentDeal?.status === '5'}
          onClick={handleArchiveThrottled}
              

          className={`w-full h-12 rounded-full font-bold text-lg transition-transform flex items-center justify-center gap-2 ${
             currentDeal?.status === '5'
               ? 'bg-gray-300 text-white cursor-not-allowed'
               : 'bg-[#4337F1] text-white shadow-lg active:scale-95'
          }`}
        >
          {currentDeal?.status === '5' ? (
            '已归档'
          ) : (
            <>
              <Archive size={20} strokeWidth={2.5} />
              归档
            </>
          )}
        </button>
      </div>

      
      {/* Voice Input Modal */}
      <VoiceInputModal
        visible={voiceModalVisible}
        dealId={currentDeal?.id}
        initialContent={voiceModalInitialContent}
        onClose={() => {
          setVoiceModalVisible(false);
          setVoiceModalInitialContent(''); // 清空初始内容
        }}
        onSave={async (content) => {
          console.log('Voice input content saved:', content);
          // 刷新详情
          if (currentDeal?.id) {
             const detailRes = await dealService.getDealInstDetail(currentDeal.id);
             if (detailRes.success && detailRes.data) {
                setDealDetail(detailRes.data);
                onDealDetailLoadedRef.current?.(detailRes.data);
             }
          }
        }}
      />
    </div>
  );
};

export default DueDiligencePage;