import React, { useState, useEffect } from 'react';
import { useThrottleFn } from '../hooks/useThrottleFn';
import { ArrowLeft, ChevronRight, Edit2, FilePlus, Mic, Archive, ChevronDown, ChevronUp, RotateCw } from 'lucide-react';
import { Toast, Dialog } from 'react-vant';

import { DealRecord, DealReportStatusEnum } from '../types';
import { dealService } from '../services/dealService';
import { nativeBridge } from '@/services/nativeBridge';
import { useRecordingStore } from '../store/useRecordingStore';
import VoiceInputModal from '../components/VoiceInputModal';
import config from '../config';

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
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);
  const [isRefreshingSummary, setIsRefreshingSummary] = useState(false);

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

  // Sync dealDetail with deal prop when it changes (critical for back navigation updates from parent)
  useEffect(() => {
    if (deal) {
      setDealDetail((prev) => {
        // Only update if IDs match to avoid race conditions, or just trust the parent
        return deal.id === prev?.id ? { ...prev, ...deal } : deal;
      });
    }
  }, [deal]);

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
  // 批量保存问题逻辑 (应对模板更换后的同步)
  const saveQuestions = async () => {
    // 如果 currentDeal 存在且有同步过来的问题列表，则执行保存
    // 注意：由于 DueDiligencePage 本身不编辑问题，这里主要是保存 App.tsx 同步过来的新模板问题
    if (!currentDeal?.id || !currentDeal.questionInfoList || currentDeal.questionInfoList.length === 0) return;

    try {
      await dealService.createOrUpdateDealInst({
        id: currentDeal.id,
        questionId: currentDeal.questionId,
        questionInfoList: currentDeal.questionInfoList
      });
      console.log('[DueDiligencePage] Questions auto-saved');
    } catch (e) {
      console.error('[DueDiligencePage] Auto-save questions failed', e);
    }
  };

  const handleBackThrottled = useThrottleFn(async () => {
    await saveQuestions();
    onBack();
  }, 1000);

  // 监听原生返回键 (拦截并执行保存)
  useEffect(() => {
    const handleNativeBack = (e: Event) => {
      e.preventDefault();
      handleBackThrottled();
    };

    window.addEventListener('requestNativeBack', handleNativeBack);
    return () => {
      window.removeEventListener('requestNativeBack', handleNativeBack);
    };
  }, [handleBackThrottled]);

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
            true
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
        // 增加小延迟以解决安卓端 Dialog 关闭时可能导致的 Toast 一闪而过的问题
        setTimeout(() => {
          Toast.fail({ message: '访谈记录和补充资料不能同时为空，请先添加内容', duration: 3000 });
        }, 100);
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
            setTimeout(() => {
              Toast({ type: 'fail', message: res.message || '生成报告失败', duration: 3000 });
            }, 100);
          }
      } catch (error) {
        Toast.clear();
        console.error('Generate report failed:', error);
        setTimeout(() => {
          Toast({ type: 'fail', message: (error as any).message || '生成报告失败', duration: 3000 });
        }, 100);
      }
    }).catch(() => { });
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
      confirmButtonColor: '#4337F1',
    }).then(async () => {
      if (!currentDeal?.id) {
        Toast.fail('尽调信息不存在');
        return;
      }

      try {
        Toast.loading({ message: '归档中...', duration: 0, forbidClick: true });
        const res = await dealService.archiveDeal(currentDeal.id);

        if (res.success) {
          Toast.success('归档成功');
          // 刷新详情
          const detailRes = await dealService.getDealInstDetail(currentDeal.id);
          if (detailRes.success && detailRes.data) {
            setDealDetail(detailRes.data);
            onDealDetailLoadedRef.current?.(detailRes.data);
          }
        } else {
          // 如果业务逻辑提示失败，直接抛出错误信息
          throw new Error(res.message || '归档失败');
        }
      } catch (error: any) {
        console.error('Archive failed:', error);
        // 不在这里手动 clear，也不必重复 fail，因为 request.ts 拦截器已经处理了
        // 如果拦截器没有处理，或者需要确保显示，可以保留 fail 但不要在前面 clear
        Toast.fail(error.message || '归档失败');
      }
    }).catch(() => {
      // 取消归档
    });
  }, 1000);
  return (
    <div className="absolute inset-0 flex flex-col bg-[#F7F8FA] overflow-hidden">
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

      {/* Header */}
      <div className="bg-white border-b border-gray-100/50 relative z-50 shrink-0">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Custom Limit Tips Toast */}
          {showLimitTips && (
            <div className="fixed top-24 left-4 right-4 z-[1000] animate-[slideDown_0.3s_ease-out_forwards] flex justify-center">
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
          <h1 className="text-lg font-bold text-slate-800 truncate px-2">{currentDeal?.interviewCust || '尽调详情'}</h1>
          {currentDeal?.status === '5' ? (
            <div className="w-9" />
          ) : (
            <button
              onClick={handleEditInfoThrottled}
              className="p-2 -mr-2 text-slate-700 hover:bg-white/50 rounded-full cursor-pointer"
            >
              <Edit2 size={20} />
            </button>
          )}
        </div>
      </div>



      {/* Scrollable Content Container */}
      <div className="flex-1 min-h-0 overflow-y-auto relative z-10 scroll-smooth" style={{ WebkitOverflowScrolling: 'touch' }}>
        <div className="px-4 pb-20 space-y-4">
          {/* Status Bar / Mascot Message */}
          <div className="flex items-end mt-8 mb-4 relative">
            <div className="w-20 h-20 absolute left-6 -bottom-1.5 z-20">
              <img 
                src="/talk-assistant/assets/xiaoliye.png" 
                alt="小狸" 
                className="w-full h-full object-contain"
              />
            </div>

            <div className="w-full bg-white rounded-3xl p-3 pl-28 shadow-sm relative z-10 flex-1">
              <p className={`text-[13px] font-medium leading-tight ${
                currentDeal?.reportStatus == DealReportStatusEnum.REPORT_FAILED ? 'text-red-500 font-bold' : 'text-slate-700'
              }`}>
                {(currentDeal?.status === '5')
                  ? '访谈归档，内容仅供查阅和下载'
                  : currentDeal?.reportStatus == DealReportStatusEnum.REPORT_GENERATING
                    ? '小狸AI全速生成报告中，请稍候'
                    : currentDeal?.reportStatus == DealReportStatusEnum.REPORT_GENERATED
                      ? '报告已生成! 可以继续完善信息'
                      : currentDeal?.reportStatus == DealReportStatusEnum.REPORT_FAILED
                        ? '报告生成失败，请重新尝试'
                        : isFinishedInterview
                          ? '本次访谈已完成，可查看历史记录或生成报告'
                          : '记录创建成功，赶紧开始访谈吧...'}
              </p>
            </div>
          </div>

          {/* 访谈小总结 Card */}
            <div className="bg-white rounded-2xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.04)] relative overflow-hidden mb-3 border border-indigo-50/50">
              {/* Header */}
              <div className={`flex items-center justify-between ${currentDeal?.dealSummary ? 'mb-3' : ''} relative z-10 px-0.5`}>
                <div className="flex items-center gap-2">
                  <h3 className="text-[15px] font-black text-slate-800 tracking-tight">访谈小总结</h3>
                  <div className="bg-[#F4F7FF] text-[#86909C] text-[10px] px-2 py-0.5 rounded-md font-medium">
                    AI自动提炼，仅供参考
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {currentDeal?.status !== '5' && (
                    <button
                      onClick={async () => {
                        if (!currentDeal?.id || isRefreshingSummary) return;
                        setIsRefreshingSummary(true);
                        Toast.info({ message: '正在刷新总结...', duration: 1500 });
                        
                        try {
                          const res = await dealService.generateInterviewSummary(currentDeal.id, true);
                          if (res.success) {
                            const detailRes = await dealService.getDealInstDetail(currentDeal.id);
                            if (detailRes.success && detailRes.data) {
                              setDealDetail(detailRes.data);
                              onDealDetailLoadedRef.current?.(detailRes.data);
                              Toast.success('刷新成功');
                            }
                          } else {
                            Toast.fail(res.message || '刷新失败');
                          }
                        } catch (error) {
                          console.error('Refresh summary failed:', error);
                          Toast.fail('刷新失败');
                        } finally {
                          setIsRefreshingSummary(false);
                        }
                      }}
                      className={`p-1 text-indigo-400 hover:text-indigo-600 transition-colors active:scale-95 ${isRefreshingSummary ? 'animate-spin cursor-not-allowed opacity-70' : ''}`}
                    >
                      <RotateCw size={14} />
                    </button>
                  )}
                  <button 
                    onClick={() => currentDeal?.dealSummary && setIsSummaryExpanded(!isSummaryExpanded)}
                    disabled={!currentDeal?.dealSummary}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[12px] font-bold transition-all ${currentDeal?.dealSummary ? 'bg-[#F0F2FF] text-indigo-600 active:scale-95' : 'bg-gray-100 text-gray-300 cursor-not-allowed'}`}
                  >
                    {isSummaryExpanded ? '收起' : '展开'}
                    {isSummaryExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                </div>
              </div>

              {/* Content */}
              {currentDeal?.dealSummary ? (
                <div className={`relative z-10 px-0.5 transition-all duration-300`}>
                  <p className={`text-[14px] text-slate-700 leading-snug font-bold text-justify tracking-normal ${!isSummaryExpanded ? 'line-clamp-2' : ''}`}>
                    {currentDeal.dealSummary}
                  </p>
                </div>
              ) : (
                <div className="relative z-10 px-0.5 mt-2">
                  <p className="text-[13px] text-gray-400">访谈小总结未生成，请刷新生成</p>
                </div>
              )}
            </div>

        {/* Report Card */}
        {currentDeal?.reportStatus == DealReportStatusEnum.REPORT_GENERATED ? (
          // 报告已生成 - 卡片和按钮合并布局
          // 报告已生成 - 新版卡片样式
          <div className="rounded-3xl shadow-lg relative overflow-hidden bg-[#4337F1]">
            {/* Rocket Mascot Image */}
            <div className="absolute right-0 bottom-[48px] w-28 h-28 z-0">
               <img
                 src={`${basePath}assets/rocketxiaoli.png`}
                 alt="Rocket Mascot"
                 className="w-full h-full object-contain object-bottom block"
               />
            </div>
            
            {/* Decorative circles */}
            <div className="absolute top-[-20px] right-[-20px] w-24 h-24 bg-white/10 rounded-full blur-2xl z-0" />
            <div className="absolute bottom-[20%] left-[10%] w-20 h-20 bg-white/5 rounded-full blur-xl z-0" />

            {/* Content Container */}
            <div className="relative z-10 flex flex-col h-full">
              {/* Top Section - Info (Clickable for preview) */}
              <div 
                className="px-5 pt-4 pb-0 text-white cursor-pointer"
                onClick={handleReportPreviewThrottled}
              >
                <div className="max-w-[70%]">
                  <h2 className="text-[18px] font-bold mb-2 leading-tight">
                    尽调报告
                  </h2>
                  <p className="text-white/90 text-[14px] font-light leading-relaxed">
                    访谈即报告，洞察更高效。小狸自动捕捉核心要点。
                  </p>
                </div>
              </div>

              {/* Spacer */}
              <div className="h-1"></div>

              {/* Bottom Section - Actions */}
              <div className="px-4 py-3 bg-black/10 flex items-center justify-end gap-3 mt-auto backdrop-blur-[2px]">
                {(currentDeal?.status === '5') ? (
                  // 已归档状态：仅显示立即下载
                  <button
                    onClick={handleDownloadReportThrottled}
                    className="px-3.5 py-1.5 bg-transparent border border-white/60 text-white rounded-full text-xs font-medium active:scale-95 transition-transform whitespace-nowrap"
                  >
                    立即下载
                  </button>
                ) : (
                  // 未归档状态：显示完整功能
                  <>
                    <button
                      onClick={handleGenerateReportThrottled}
                      className="px-3.5 py-1.5 bg-white text-[#4337F1] rounded-full text-xs font-bold shadow-sm active:scale-95 transition-transform whitespace-nowrap"
                    >
                      {currentDeal?.reportStatus === DealReportStatusEnum.REPORT_GENERATED ? '重新生成' : '立即生成'}
                    </button>
                    <button
                      onClick={handleDownloadReportThrottled}
                      className="px-3.5 py-1.5 bg-transparent border border-white/60 text-white rounded-full text-xs font-medium active:scale-95 transition-transform whitespace-nowrap"
                    >
                      立即下载
                    </button>
                    <button
                      className="px-3.5 py-1.5 bg-transparent border border-white/60 text-white rounded-full text-xs font-medium active:scale-95 transition-transform whitespace-nowrap"
                      onClick={handleChangeTemplateThrottled}
                    >
                      更换模板
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ) : (
          // 其他状态 - 原来的卡片样式
          // 其他状态 - 新版卡片样式
          <div className="rounded-3xl shadow-lg relative overflow-hidden bg-[#4337F1]">
            {/* Rocket Mascot Image - Spans across top and bottom, sits behind content */}
            <div className="absolute right-0 bottom-[48px] w-28 h-28 z-0">
               <img
                 src={`${basePath}assets/rocketxiaoli.png`}
                 alt="Rocket Mascot"
                 className="w-full h-full object-contain object-bottom block"
               />
            </div>
            
            {/* Decorative circles - Background */}
            <div className="absolute top-[-20px] right-[-20px] w-24 h-24 bg-white/10 rounded-full blur-2xl z-0" />
            <div className="absolute bottom-[20%] left-[10%] w-20 h-20 bg-white/5 rounded-full blur-xl z-0" />

            {/* Content Container */}
            <div className="relative z-10 flex flex-col h-full">
              {/* Top Section - Info */}
              <div className="px-5 pt-4 pb-0 text-white">
                <div className="max-w-[70%]">
                  <h2 className="text-[18px] font-bold mb-2 leading-tight">
                    尽调报告
                  </h2>
                  <p className="text-white/90 text-[14px] font-light leading-relaxed">
                    访谈即报告，洞察更高效。小狸AI智能捕捉核心要点。
                  </p>
                </div>
              </div>

              {/* Spacer to push bottom section down if needed, or just padding */}
              <div className="h-1"></div>

              {/* Bottom Section - Actions */}
              <div className="px-4 py-3 bg-black/10 flex items-center justify-end gap-3 mt-auto backdrop-blur-[2px]">
                {currentDeal?.reportStatus == DealReportStatusEnum.REPORT_GENERATING ? (
                   // Loading State
                   <div className="flex items-center gap-2 py-1 mr-auto pl-2">
                     <div className="w-4 h-4 border-2 border-white/80 border-t-transparent rounded-full animate-spin"></div>
                     <span className="text-white/90 text-xs font-medium">小狸AI全速生成报告中，请稍候...</span>
                   </div>
                ) : (
                   // Action Buttons
                   <>
                    <button
                      onClick={() => {
                        Dialog.confirm({
                          title: '确认生成报告?',
                          message: '系统将根据当前尽调资料、访谈录音和报告模板生成尽调报告（由AI自动生成）',
                          confirmButtonText: '确认',
                          cancelButtonText: '取消',
                          confirmButtonColor: '#4337F1',
                        }).then(async () => {
                          if (!currentDeal?.id) {
                            Toast.fail('尽调信息不存在');
                            return;
                          }

                          // 检查访谈记录和补充资料是否都为空
                          const hasInterviewRecords = currentDeal.interviewInstList && currentDeal.interviewInstList.length > 0;
                          const hasSupplementaryMaterials = currentDeal.resources && currentDeal.resources.length > 0;

                          if (!hasInterviewRecords && !hasSupplementaryMaterials) {
                            setTimeout(() => {
                              Toast.fail({ message: '访谈记录和补充资料不能同时为空，请先添加内容', duration: 3000 });
                            }, 100);
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
                              setTimeout(() => {
                                Toast({ type: 'fail', message: res.message || '生成报告失败', duration: 3000 });
                              }, 100);
                            }
                          } catch (error) {
                            Toast.clear();
                            console.error('Generate report failed:', error);
                            setTimeout(() => {
                              Toast({ type: 'fail', message: (error as any).message || '生成报告失败', duration: 3000 });
                            }, 100);
                          }
                        }).catch(() => {});
                      }}
                      className="px-3.5 py-1.5 bg-white text-[#4337F1] rounded-full text-xs font-bold shadow-sm active:scale-95 transition-transform whitespace-nowrap"
                    >
                      {currentDeal?.reportStatus == DealReportStatusEnum.REPORT_FAILED ? '重新生成' : '立即生成'}
                    </button>
                    <button
                      className="px-3.5 py-1.5 bg-transparent border-[1px] border-white/60 text-white rounded-full text-xs font-medium active:scale-95 transition-transform whitespace-nowrap"
                      onClick={handleChangeTemplateThrottled}
                    >
                      更换模板
                    </button>
                   </>
                )}
              </div>
            </div>
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
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-800 text-[16px]">尽调资料</h3>
                {(() => {
                  const resourcesCount = currentDeal?.resources?.length || 0;
                  const supplementaryCount = Array.isArray(currentDeal?.supplementary) ? currentDeal.supplementary.length : 0;
                  const totalCount = resourcesCount + supplementaryCount;
                  return totalCount > 0 ? (
                    <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-[11px] font-bold shadow-md shadow-indigo-200">
                      {totalCount}
                    </span>
                  ) : null;
                })()}
              </div>
              <p className="text-xs text-gray-400 mt-1">自动解析</p>
            </div>
            
            <div className="flex items-end justify-between mt-4">
              <div className="flex flex-wrap gap-1.5 flex-1 mr-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNavigateMaterialsThrottled();
                  }}
                  className="px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold border border-indigo-100 whitespace-nowrap"
                 >
                   {currentDeal?.status === '5' ? '立即查看' : '立即添加'}
                 </button>
               </div>
               <FilePlus className="text-gray-300 w-8 h-8 opacity-50 flex-shrink-0" strokeWidth={1.5} />
            </div>
          </div>

          {/* Recording */}
          <div
            className="bg-white rounded-2xl p-4 shadow-sm flex flex-col justify-between min-h-[140px] cursor-pointer active:scale-[0.98] transition-all"
            onClick={handleRecordingClickThrottled}
          >
            <div>
              <h3 className="font-bold text-slate-800 text-[16px]">访谈录音</h3>
              <p className="text-xs text-gray-400 mt-1">语音转写</p>
            </div>

            <div className="flex items-end justify-between mt-4">
              <button
                // Remove onClick here to let the parent div handle it, or keep stopPropagation if needed
                // But user request implies clicking anywhere on container works.
                // Keeping button visual style but removing duplicate click handler or preventing bubbling isn't strictly necessary if parent handles it,
                // BUT consistent UX usually means buttons inside clickable cards might do specific things.
                // Here the action is the same.
                className={`px-3 py-1.5 rounded-full text-xs font-bold border ${currentDeal?.status === '5'
                  ? 'bg-indigo-50 text-indigo-600 border-indigo-100'
                  : 'bg-indigo-50 text-indigo-600 border-indigo-100'
                  } whitespace-nowrap`}
              >
                {(currentDeal?.status === '5') ? '历史访谈' : '+访谈录音'}
              </button>
              <Mic className="text-indigo-200 w-8 h-8 opacity-50" strokeWidth={1.5} />
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

        {/* Bottom Spacer */}

      </div>
    </div>

      {/* Fixed Archive Button at Bottom */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto px-4 pb-3 z-30">
        <button
          disabled={currentDeal?.status === '5'}
          onClick={handleArchiveThrottled}


          className={`w-full h-12 rounded-full font-bold text-lg transition-transform flex items-center justify-center gap-2 ${currentDeal?.status === '5'
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