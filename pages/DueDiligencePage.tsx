import React, { useState, useEffect } from 'react';
import { useThrottleFn } from '../hooks/useThrottleFn';
import { ArrowLeft, ChevronRight, Edit2, Mic, Archive, ChevronDown, ChevronUp, RotateCw, FileText, Eye, Download, RefreshCw } from 'lucide-react';
import { Toast, Dialog } from 'react-vant';

import { DealRecord, DealReportStatusEnum, QuestionInfo, TemplateInfo } from '../types';
import { dealService } from '../services/dealService';
import { nativeBridge } from '@/services/nativeBridge';
import { useRecordingStore } from '../store/useRecordingStore';
import VoiceInputModal from '../components/VoiceInputModal';
import TemplateSwitchModal from '../components/TemplateSwitchModal';
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
  onNavigateToEnterpriseDetail?: (data: any) => void;
  onBack: () => void;
  isEnterpriseSyncing?: boolean;
  setIsEnterpriseSyncing?: (syncing: boolean) => void;
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
  onDealDetailLoaded,
  onNavigateToEnterpriseDetail,
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
  const [templateModalVisible, setTemplateModalVisible] = useState(false);
  const [templates, setTemplates] = useState<TemplateInfo[]>([]);
  const [isAnalyzingAi, setIsAnalyzingAi] = useState(false);
  const [aiInsightList, setAiInsightList] = useState<any[]>([]);
  const [voiceModalInitialContent, setVoiceModalInitialContent] = useState('');
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);
  const [isRefreshingSummary, setIsRefreshingSummary] = useState(false);
  const [interviewRecords, setInterviewRecords] = useState<any[]>([]);
  const [interviewTotalCount, setInterviewTotalCount] = useState(0);

  // 上传状态锁，防止重复触发
  const isUploadingRef = React.useRef(false);
  // 记录最后一次保存的问题列表状态（JSON字符串），用于判断是否有更新
  const lastSavedQuestionsRef = React.useRef<string>('');

  // 企查查/天眼查数据状态
  const [enterpriseInfo, setEnterpriseInfo] = useState<any>(null);
  const [aiInsights, setAiInsights] = useState<any[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [loadingEnterprise, setLoadingEnterprise] = useState(false);
  const [lastEnterpriseKey, setLastEnterpriseKey] = useState<string>(''); // 用于记录上次抓取时的企业标识

  const fetchTemplates = async (dealId: string) => {
    try {
      const res = await dealService.getTemplateList(dealId);
      if (res.success && res.data) {
        setTemplates(res.data);
      }
    } catch (e) {
      console.error('Failed to fetch templates:', e);
    }
  };

  const fetchDealDetail = async () => {
    if (!deal?.id) return;
    try {
      const res = await dealService.getDealInstDetail(deal.id);
      if (res.success && res.data) {
        setDealDetail(res.data);
        // 初始加载或刷新时，记录当前服务器端的问题列表状态
        if (res.data.questionInfoList) {
          lastSavedQuestionsRef.current = JSON.stringify(res.data.questionInfoList);
        }
        // 通知父组件更新数据
        onDealDetailLoadedRef.current?.(res.data);
      }
    } catch (error) {
      console.error('Failed to fetch deal detail:', error);
    }
  };

  const fetchInterviewRecords = async () => {
    if (!deal?.id) return;
    try {
      const res = await dealService.queryInterviewInstListByPage({
        interviewDealInstId: deal.id,
        pageNum: 1,
        pageSize: 100,
      });
      if (res.success && res.data) {
        const allRecords = res.data.records || [];
        setInterviewRecords(allRecords);
        // 只统计已真正录过音的实例
        const completedRecords = allRecords.filter(
          (r: any) => r.interviewInstStatus && String(r.interviewInstStatus) !== '1'
        );
        setInterviewTotalCount(completedRecords.length);
      }
    } catch (e) {
      console.error('Failed to fetch interview records:', e);
    }
  };

  const fetchEnterpriseData = async () => {
    // 逻辑优化：如果没有填写公司名称/信用代码，不自动调用接口抓取
    const hasEnterpriseInfo = currentDeal?.companyName?.trim() || currentDeal?.creditCode?.trim();
    if (!deal?.id || !hasEnterpriseInfo) return;
    
    setLoadingEnterprise(true);
    try {
      const basicRes = await dealService.getEnterpriseBasicInfo(deal.id);
      if (basicRes.success) setEnterpriseInfo(basicRes.data);
    } catch (e) {
      console.error('Failed to fetch enterprise data:', e);
    } finally {
      setLoadingEnterprise(false);
    }
  };

  // 进入页面时请求详情（只在 deal.id 变化时请求）
  useEffect(() => {
    if (!deal?.id) return;

    // 清除/初始化前一个详情的数据状态
    setDealDetail(null);
    setInterviewRecords([]);
    setInterviewTotalCount(0);
    fetchTemplates(deal.id);

    fetchDealDetail();
    fetchInterviewRecords();
    fetchEnterpriseData();
  }, [deal?.id]);

  // Sync dealDetail with deal prop when it changes (critical for back navigation updates from parent)
  useEffect(() => {
    if (deal) {
      setDealDetail((prev) => {
        const nextDetail = deal.id === prev?.id ? { ...prev, ...deal } : deal;
        
        // 逻辑优化：如果从编辑返回，且企业信息从无到有，自动触发一次抓取
        const currentKey = `${nextDetail.companyName || ''}-${nextDetail.creditCode || ''}`;
        const prevKey = `${prev?.companyName || ''}-${prev?.creditCode || ''}`;
        
        // 如果当前有信息，且与上次不一样（通常是从无到有），且没有正在加载
        if (currentKey !== '-' && currentKey !== prevKey && !loadingEnterprise) {
            // 设置一个标记让接下来的 useEffect 触发抓取，或者直接在这里检查
            console.log('[DueDiligence] Company info updated, triggering auto-fetch');
        }
        
        return nextDetail;
      });
    }
  }, [deal]);

  // 使用详情数据，如果没有则使用传入的 deal
  const currentDeal = dealDetail || deal;

  const basicInfo = enterpriseInfo || {};

  // 判定是否填写了公司名称或信用代码
  const hasEnterpriseName = !!(
    currentDeal?.companyName?.trim() || 
    currentDeal?.creditCode?.trim() ||
    basicInfo.name?.trim()
  );

  // 监听企业核心信息变化，触发自动抓取
  useEffect(() => {
    const currentKey = `${currentDeal?.companyName || ''}-${currentDeal?.creditCode || ''}`;
    // 如果核心 key 发生了实质性变化（且不为空），则触发抓取
    if (currentKey !== '-' && currentKey !== lastEnterpriseKey) {
        setLastEnterpriseKey(currentKey);
        fetchEnterpriseData();
    }
  }, [currentDeal?.companyName, currentDeal?.creditCode]);

  /* 
  // 轮询检查报告生成状态 (已弃用，改为 WebSocket)
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
  */

  // WebSocket 实时检查报告生成状态
  useEffect(() => {
    // 只有当报告状态为"生成中"时才启动 WebSocket
    if (currentDeal?.reportStatus != DealReportStatusEnum.REPORT_GENERATING || !currentDeal?.id) {
      return;
    }

    const token = localStorage.getItem('zov-user-token') || '';
    const wsBaseUrl = config.apiBaseUrl.replace('https', 'wss').replace('http', 'ws');
    const wsUrl = `${wsBaseUrl}/ws/report-status?dealInstId=${currentDeal.id}&token=${token}`;

    console.log('[WebSocket] Connecting to report status:', wsUrl);
    
    let socket: WebSocket | null = new WebSocket(wsUrl);

    socket.onmessage = (event) => {
      console.log('[WebSocket] Received report status update:', event.data);
      try {
        // 尝试解析推送的消息内容
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        // 如果包含 reportStatus，则直接更新本地状态
        const newStatus = data.reportStatus || (typeof data === 'string' ? data : null);
        
        if (newStatus) {
          setDealDetail(prev => {
            if (!prev) return null;
            // 只有当状态确实发生变化时才更新，避免无效渲染
            if (prev.reportStatus === newStatus) return prev;
            console.log('[WebSocket] Updating local reportStatus to:', newStatus);
            return { ...prev, reportStatus: newStatus };
          });
        }
      } catch (e) {
        // 非 JSON 格式则尝试作为纯字符串状态处理
        const newStatus = event.data;
        if (newStatus && typeof newStatus === 'string') {
          setDealDetail(prev => (prev && prev.reportStatus !== newStatus) ? { ...prev, reportStatus: newStatus } : prev);
        }
      }
    };

    socket.onerror = (error) => {
      console.error('[WebSocket] Error occurred:', error);
    };

    socket.onclose = (e) => {
      console.log('[WebSocket] Connection closed:', e.code, e.reason);
      socket = null;
    };

    return () => {
      if (socket) {
        console.log('[WebSocket] Cleaning up connection');
        socket.close();
        socket = null;
      }
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

    // 检查是否有实际更新：对比当前列表与最后一次保存/加载的列表
    const currentQuestionsStr = JSON.stringify(currentDeal.questionInfoList);
    if (currentQuestionsStr === lastSavedQuestionsRef.current) {
        console.log('[DueDiligencePage] No question changes, skipping auto-save');
        return;
    }

    try {
      await dealService.createOrUpdateDealInst({
        id: currentDeal.id,
        questionId: currentDeal.questionId,
        questionInfoList: currentDeal.questionInfoList
      });
      console.log('[DueDiligencePage] Questions auto-saved');
      // 保存成功后更新本地记录的“最后保存状态”
      lastSavedQuestionsRef.current = currentQuestionsStr;
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
    const isRegenerate = currentDeal?.reportStatus == DealReportStatusEnum.REPORT_GENERATED;
    Dialog.confirm({
      title: (
        <span style={{ fontFamily: "'PingFang SC', sans-serif", fontSize: '16px', fontWeight: 500, lineHeight: 'normal', letterSpacing: '0em', fontVariationSettings: '"opsz" auto', color: '#242424' }}>
          {isRegenerate ? '确认重新生成报告?' : '确认生成报告?'}
        </span>
      ),
      message: (
        <div>
          <p style={{ fontFamily: "'PingFang SC', sans-serif", fontSize: '14px', fontWeight: 'normal', lineHeight: '22px', textAlign: 'center', letterSpacing: '0em', fontVariationSettings: '"opsz" auto', color: '#595959', marginBottom: '10px' }}>
            {isRegenerate 
              ? '是否确认根据当前尽调资料和访谈录音重新生成报告？原有报告内容将被覆盖'
              : '系统将根据当前尽调资料、访谈录音和报告模板生成尽调报告（由AI自动生成）'}
          </p>
          <p style={{ fontSize: '11px', color: '#9CA3AF', lineHeight: '1.5' }}>
            小狸报告将使用通义千问 AI 技术为您处理音频图像和文件。点击确认即代表您授权我们将相关素材加密传输至 AI 服务商进行内容识别及报告生成
          </p>
        </div>
      ),
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

  const handleSwitchTemplate = async (questionId: string) => {
    if (!currentDeal?.id) return;
    try {
      Toast.loading({ message: '切换中...', duration: 0 });
      const res = await dealService.createOrUpdateDealInst({
        id: currentDeal.id,
        questionId: questionId
      });
      if (res.success) {
        // 成功后全量拉取最新详情和模板列表，触发 UI 同步更新
        await Promise.all([
          fetchDealDetail(),
          fetchTemplates(currentDeal.id)
        ]);
        Toast.success('清单已更新');
      } else {
        Toast.fail(res.message || '切换失败');
        throw new Error(res.message);
      }
    } catch (e: any) {
      console.error('Switch template failed:', e);
      Toast.fail(e.message || '网络错误');
      throw e;
    }
  };

  const handleAiInsight = async () => {
    if (!currentDeal?.id || isAnalyzingAi) return;
    try {
      setIsAnalyzingAi(true);
      const res = await dealService.getAiInsight(currentDeal.id, true);
      if (res.success) {
        if (res.success && Array.isArray(res.data)) {
          setAiInsightList(res.data); // 更新本地展示区
        }
        await fetchDealDetail();
        Toast.success('AI 洞察生成成功');
      } else {
        Toast.info(res.message || '查询异常：该尽调无企业信息，无法生成AI洞察');
      }
    } catch (e: any) {
      console.error('AI Insight failed:', e);
      Toast.info(e.message || '查询异常：该尽调无企业信息，无法生成AI洞察');
    } finally {
      setIsAnalyzingAi(false);
    }
  };

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

  const handleCancelArchiveThrottled = useThrottleFn(() => {
    if (!currentDeal?.id) return;
    Dialog.confirm({
      title: '取消归档',
      message: '确定要将此记录取消归档并恢复到进行中吗？',
      onConfirm: async () => {
        try {
          Toast.loading({ message: '正在取消归档...', duration: 0, forbidClick: true });
          const res = await dealService.cancelArchive(currentDeal.id!);
          if (res.success) {
            Toast.success('已取消归档');
            // 刷新详情
            const detailRes = await dealService.getDealInstDetail(currentDeal.id!);
            if (detailRes.success && detailRes.data) {
              setDealDetail(detailRes.data);
              onDealDetailLoadedRef.current?.(detailRes.data);
            }
          } else {
            Toast.fail(res.message || '操作失败');
          }
        } catch (error) {
          console.error("Failed to cancel archive:", error);
          Toast.fail('操作失败');
        } finally {
          Toast.clear();
        }
      }
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
        <div className="px-4 pb-36 pt-4 space-y-3">
          {(() => {
            const isArchived = currentDeal?.status === '5';
            // 判断是否有真正完成了录音的访谈记录
            // interviewTotalCount 已在 fetchInterviewRecords 中过滤掉了仅创建未录音的实例
            // interviewInstList 也需要过滤：只有 interviewInstStatus !== '1' 的才算有效
            const completedInstList = Array.isArray(currentDeal?.interviewInstList)
              ? currentDeal.interviewInstList.filter((r: any) => r.interviewInstStatus && String(r.interviewInstStatus) !== '1')
              : [];
            const hasInterviewRecords = interviewTotalCount > 0 || 
                                       ['4', '5'].includes(currentDeal?.status || '') || 
                                       completedInstList.length > 0;
            const isGenerated = currentDeal?.reportStatus == DealReportStatusEnum.REPORT_GENERATED;
            const isGenerating = currentDeal?.reportStatus == DealReportStatusEnum.REPORT_GENERATING;
            const isFailed = currentDeal?.reportStatus == DealReportStatusEnum.REPORT_FAILED;
            
            let headerIcon = '';
            let headerTitle = '';
            let headerSub = '';
            
            if (isGenerated) {
              headerIcon = 'talksuccess.png';
              headerTitle = '报告已生成';
              headerSub = '访谈即报告，小狸智能捕捉核心洞察';
            } else if (String(currentDeal?.status) === '1') {
              // 状态 1 明确为“尽调准备阶段”，绝不可能有已完成的真实访谈，屏蔽一切可能的脏数据
              headerIcon = 'talkfaild.png';
              headerTitle = '访谈未开始';
              headerSub = '暂无访谈记录，请先开始访谈';
            } else if (['2', '3'].includes(String(currentDeal?.status))) {
              // 状态 2, 3（已创建部分、进行中）且未生成报告时
              if (hasInterviewRecords) {
                headerIcon = 'talksuccess.png';
                headerTitle = '访谈已完成';
                headerSub = '访谈即报告，小狸智能捕捉核心洞察';
              } else {
                headerIcon = 'talkfaild.png';
                headerTitle = '访谈未开始';
                headerSub = '暂无访谈记录，请先开始访谈';
              }
            } else if (hasInterviewRecords || ['4', '5'].includes(String(currentDeal?.status))) {
              headerIcon = 'talksuccess.png';
              headerTitle = '访谈已完成';
              headerSub = '访谈即报告，小狸智能捕捉核心洞察';
            }
            
            if (isGenerating) {
              headerIcon = 'talksuccess.png';
              headerTitle = '报告生成中';
              headerSub = '小狸AI全速生成报告中，请稍候...';
            } else if (isFailed) {
              headerIcon = 'talkfaild.png';
              headerTitle = '报告生成失败';
              headerSub = '请重试或检查资料内容';
            }
            
            // 如果连标题都没有（还在加载初始状态），则渲染一个带骨架感的占位容器或保持留白
            if (!headerTitle && !isGenerating) {
               return (
                 <div className="bg-white rounded-[24px] p-4 shadow-[0_2px_16px_rgba(0,0,0,0.06)] border border-indigo-50/30 h-[178px] flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-indigo-100 border-t-indigo-500 rounded-full animate-spin"></div>
                 </div>
               );
            }

            return (
              <div className="bg-white rounded-[24px] p-4 shadow-[0_2px_16px_rgba(0,0,0,0.06)] border border-indigo-50/30">
                <div className="flex items-center gap-0 mb-3 -mt-2">
                  <div className="w-[100px] h-[100px] flex-shrink-0 relative -ml-3 -my-3">
                     <img src={`${basePath}assets/${headerIcon}`} alt="status" className="w-full h-full object-contain drop-shadow-sm" />
                  </div>
                  <div className="flex flex-col gap-0.5 z-10 -ml-1">
                     <h2 className="text-[17.5px] font-bold text-slate-800 tracking-tight">{headerTitle}</h2>
                     <p className="text-[12px] text-gray-500 leading-snug">{headerSub}</p>
                  </div>
                </div>

                <div className="flex flex-col gap-2.5">
                  {(!isArchived) && (
                  <button 
                    onClick={handleGenerateReportThrottled}
                    disabled={isGenerating}
                    className="w-full bg-[#4B42F5] text-white rounded-2xl py-[12px] flex items-center justify-center gap-2 font-medium text-[14px] active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isGenerating ? (
                      <div className="w-4 h-4 border-2 border-white/80 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <FileText size={16} />
                    )}
                    <span>{isGenerating ? '报告生成中...' : (isGenerated ? '重新生成报告' : '立即生成报告')}</span>
                  </button>
                  )}

                  {isGenerated && !isGenerating ? (
                    <div className="flex gap-2">
                      <button onClick={handleReportPreviewThrottled} className="flex-1 bg-white border border-gray-100 rounded-2xl py-2.5 flex flex-col items-center justify-center gap-1 active:scale-[0.98] transition-all shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
                        <Eye size={16} className="text-gray-600" />
                        <span className="text-[11px] text-gray-700 font-medium">预览报告</span>
                      </button>
                      <button onClick={handleDownloadReportThrottled} className="flex-1 bg-white border border-gray-100 rounded-2xl py-2.5 flex flex-col items-center justify-center gap-1 active:scale-[0.98] transition-all shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
                        <Download size={16} className="text-gray-600" />
                        <span className="text-[11px] text-gray-700 font-medium">立即下载</span>
                      </button>
                      {(!isArchived) && (
                      <button 
                        onClick={() => {
                          if (isGenerating) {
                            Toast.info('报告正在生成中，暂不支持更换模板');
                            return;
                          }
                          handleChangeTemplateThrottled?.();
                        }}
                        disabled={isGenerating}
                        className={`flex-1 bg-white border border-gray-100 rounded-2xl py-2.5 flex flex-col items-center justify-center gap-1 active:scale-[0.98] transition-all shadow-[0_2px_8px_rgba(0,0,0,0.02)] ${isGenerating ? 'opacity-50 grayscale select-none' : ''}`}
                      >
                        <RefreshCw size={16} className="text-gray-600" />
                        <span className="text-[11px] text-gray-700 font-medium">更换模板</span>
                      </button>
                      )}
                    </div>
                  ) : (
                    (!isArchived) && (
                    <button 
                      onClick={() => {
                        if (isGenerating) {
                          Toast.info('报告正在生成中，暂不支持更换模板');
                          return;
                        }
                        handleChangeTemplateThrottled?.();
                      }}
                      disabled={isGenerating}
                      className={`w-full bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] rounded-2xl py-[12px] flex items-center justify-center gap-1.5 font-medium text-[14px] text-gray-700 active:scale-[0.98] transition-all ${isGenerating ? 'opacity-50 grayscale select-none' : ''}`}
                    >
                      <RefreshCw size={16} className="text-gray-600" />
                      <span>更换模板</span>
                    </button>
                    )
                  )}
                </div>
              </div>
            );
          })()}

          {/* 尽调小总结 Card */}
          <div className="bg-white rounded-[20px] p-4 shadow-[0_2px_12px_rgba(0,0,0,0.04)] relative overflow-hidden">
            <div className={`flex items-center justify-between ${currentDeal?.dealSummary ? 'mb-3' : ''} relative z-10 px-0.5`}>
              <div className="flex items-center gap-2">
                <h3 className="text-[16px] font-bold text-slate-800 tracking-tight">尽调小总结</h3>
                <div className="bg-[#F4F7FF] text-[#86909C] text-[10px] px-2 py-0.5 rounded-md font-medium">
                  自动提炼, 仅供参考
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
                  className={`flex items-center gap-0.5 px-2 py-0.5 rounded-[6px] text-[11px] font-medium transition-all ${currentDeal?.dealSummary ? 'bg-[#F0F2FF] text-[#4B42F5] active:scale-95' : 'bg-gray-100 text-gray-300 cursor-not-allowed'}`}
                >
                  {isSummaryExpanded ? '收起' : '展开'}
                  {isSummaryExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>
              </div>
            </div>

            {currentDeal?.dealSummary ? (
              <div className={`relative z-10 px-0.5 transition-all duration-300`}>
                <p className={`text-[13px] text-gray-700 leading-relaxed text-justify tracking-normal ${!isSummaryExpanded ? 'line-clamp-2' : ''}`}>
                  {currentDeal.dealSummary}
                </p>
              </div>
            ) : (
              <div className="relative z-10 px-0.5 mt-2">
                <p className="text-[13px] text-gray-400">尽调小总结未生成，请刷新生成</p>
              </div>
            )}
          </div>

          {/* 尽调资料 */}
          {(() => {
            const resourcesCount = currentDeal?.resources?.length || 0;
            const supplementaryCount = Array.isArray(currentDeal?.supplementary) ? currentDeal.supplementary.length : 0;
            const totalCount = resourcesCount + supplementaryCount;
            
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
              } else if (['mp3', 'wav', 'm4a', 'aac', 'flac', 'amr', '3gp', 'ogg'].includes(ext)) {
                return `${basePath}assets/wav.png`;
              } else if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(ext)) {
                return `${basePath}assets/image.png`;
              }
              return `${basePath}assets/txt.png`;
            };

            const displayList = [
              ...(currentDeal?.resources || []).map((r: any) => ({ name: r.fileName || r.name || '资料', fileName: r.fileName })),
              ...(Array.isArray(currentDeal?.supplementary) ? currentDeal.supplementary : []).map((s: any) => ({ name: s.fileName || s.name || '补充资料', fileName: s.fileName }))
            ].slice(0, 2);

            return (
            <div 
              className="bg-white rounded-[20px] p-4 shadow-[0_2px_12px_rgba(0,0,0,0.04)] relative overflow-hidden active:bg-gray-50 transition-colors cursor-pointer"
              onClick={handleNavigateMaterialsThrottled}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[16px] font-bold text-slate-800 tracking-wider">尽调资料 <span className="font-medium">({totalCount})</span></h3>
                <div className="flex items-center gap-1">
                  <button 
                    className="flex items-center border border-[#4B42F5] text-[#4B42F5] rounded-full px-2.5 py-[2px] text-[11px] active:bg-indigo-50"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNavigateMaterialsThrottled();
                    }}
                  >
                    {currentDeal?.status !== '5' && <span className="font-bold mr-0.5">+</span>}
                    {currentDeal?.status === '5' ? '立即查看' : '立即添加'}
                  </button>
                  <ChevronRight size={14} className="text-gray-300" />
                </div>
              </div>

              {totalCount === 0 ? (
                <div className="border border-dashed border-gray-200 rounded-xl py-4 flex items-center justify-center gap-2">
                  <FileText size={14} className="text-gray-300" />
                  <span className="text-[12px] text-gray-400">暂无尽调资料</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {displayList.map((item: any, idx: number) => {
                    const iconSrc = getFileIconSrc(item.fileName);
                    return (
                    <div key={idx} className="border border-gray-100 rounded-xl px-3 py-2.5 flex items-center gap-2 bg-[#FAFAFA]/50">
                      <div className="w-[26px] h-[26px] flex-shrink-0">
                        <img src={iconSrc} alt="file icon" className="w-full h-full object-contain" />
                      </div>
                      <span className="text-[13px] text-slate-700 truncate">{item.name}</span>
                    </div>
                  )})}
                </div>
              )}
            </div>
            )
          })()}

          {/* 访谈录音 */}
          {(() => {
            const records = interviewRecords;
            const totalCount = interviewTotalCount;
            const displayList = records.slice(0, 2);

            return (
            <div 
              className="bg-white rounded-[20px] p-4 shadow-[0_2px_12px_rgba(0,0,0,0.04)] relative overflow-hidden active:bg-gray-50 transition-colors cursor-pointer"
              onClick={handleRecordingClickThrottled}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[16px] font-bold text-slate-800 tracking-wider">访谈录音 <span className="font-medium">({totalCount})</span></h3>
                <div className="flex items-center gap-1">
                  <button 
                    className="flex items-center border border-[#4B42F5] text-[#4B42F5] rounded-full px-2.5 py-[2px] text-[11px] active:bg-indigo-50"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRecordingClickThrottled();
                    }}
                  >
                    {currentDeal?.status !== '5' && <span className="font-bold mr-0.5">+</span>}
                    {currentDeal?.status === '5' ? '历史访谈' : '访谈录音'}
                  </button>
                  <ChevronRight size={14} className="text-gray-300" />
                </div>
              </div>

              {totalCount === 0 ? (
                <div className="border border-dashed border-gray-200 rounded-xl py-4 flex items-center justify-center gap-2">
                  {/* mockup uses a specific line icon, using general audio icon here */}
                  <div className="w-3.5 h-3.5 flex items-center justify-center border border-gray-300 rounded-[2px]">
                     <div className="w-1 h-2 bg-gray-300 rounded-full"></div>
                  </div>
                  <span className="text-[12px] text-gray-400">暂无访谈录音</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {displayList.map((item: any, idx: number) => (
                    <div key={idx} className="border border-gray-100 rounded-xl px-3 py-2.5 flex items-center gap-2 bg-[#FAFAFA]/50">
                      <div className="w-[26px] h-[26px] bg-[#EAF2FF] rounded flex justify-center items-center text-[#5681F0]">
                        <Mic size={14} />
                      </div>
                      <span className="text-[13px] text-slate-700 truncate">{item.interviewInstName || '访谈录音'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            )
          })()}

          {/* 企查查资料 */}
          {(() => {
            const handleSync = async () => {
                const name = currentDeal?.companyName?.trim() || basicInfo.name?.trim();
                const code = currentDeal?.creditCode?.trim();
                
                if (!name && !code) {
                    Toast.info('请先填写企业名称，再抓取数据');
                    onEditInfo?.();
                    return;
                }

                if (!currentDeal?.id || isSyncing) return;
                try {
                    setIsSyncing(true);
                    Toast.loading({ message: '同步中...', duration: 0 });
                    const res = await dealService.syncEnterprise(currentDeal.id);
                    if (res.success) {
                        Toast.success('同步指令已下发，后台处理中');
                        // 稍微延迟后刷新数据
                        setTimeout(async () => {
                            const basicRes = await dealService.getEnterpriseBasicInfo(currentDeal.id!);
                            if (basicRes.success) setEnterpriseInfo(basicRes.data);
                        }, 2000);
                    } else {
                        Toast.info(res.message || '请先填写企业名称，再抓取数据');
                    }
                } catch (e: any) {
                    console.error('Sync failed:', e);
                    Toast.info(e.message || '请先填写企业名称，再抓取数据');
                } finally {
                    setIsSyncing(false);
                }
            };

            const getInsightStatus = () => {
                if (isSyncing) return { text: '洞察中', color: 'text-amber-500' };
                return { text: '待洞察', color: 'text-gray-400' };
            };

            const insightStatus = getInsightStatus();
            
            return (
                <div className="bg-white rounded-[24px] p-4 shadow-[0_2px_16px_rgba(0,0,0,0.06)] border border-indigo-50/30">
                    <div className="flex items-center justify-between mb-4 px-1">
                        <div className="flex items-center gap-1.5">
                            <h3 className="text-[16px] font-bold text-slate-800">企查查资料</h3>
                            <span className="text-[14px] text-slate-300 font-medium">(7项)</span>
                        </div>
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                handleSync();
                            }}
                            disabled={isSyncing}
                            className="flex items-center border border-[#4B42F5] text-[#4B42F5] rounded-full px-2.5 py-[2px] text-[11px] active:bg-indigo-50 transition-all disabled:opacity-50"
                        >
                            {isSyncing ? '抓取中...' : (basicInfo.name ? '更新资料' : '抓取资料')}
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-4">
                        {/* 企业名称 */}
                        <div className="bg-[#F8FAFE] rounded-2xl p-3 border border-indigo-50/30">
                            <p className="text-[11px] text-[#94A3B8] font-bold mb-2">企业名称</p>
                            <div className="flex items-center justify-between gap-1">
                                <span className="text-[14px] font-[800] text-slate-800 truncate">
                                    {basicInfo.name || currentDeal?.companyName || '待补充'}
                                </span>
                                <div className="bg-[#EEF2FF] text-[#6366F1] text-[9px] px-1.5 py-0.5 rounded-md flex-shrink-0 font-bold">线索</div>
                            </div>
                        </div>

                        {/* 统一代码 */}
                        <div className="bg-[#F8FAFE] rounded-2xl p-3 border border-indigo-50/30">
                            <p className="text-[11px] text-[#94A3B8] font-bold mb-2">统一代码</p>
                            <div className="flex items-center justify-between gap-1">
                                <span className="text-[14px] font-[800] text-slate-800 truncate">
                                    {basicInfo.creditCode || currentDeal?.creditCode || '待补充'}
                                </span>
                                <div className="bg-[#EEF2FF] text-[#6366F1] text-[9px] px-1.5 py-0.5 rounded-md flex-shrink-0 font-bold">线索</div>
                            </div>
                        </div>

                        {/* 企查查状态 
                        <div className="bg-[#F8FAFE] rounded-2xl p-3 border border-indigo-50/30">
                            <p className="text-[11px] text-[#94A3B8] font-bold mb-2">企查查状态</p>
                            <div className="flex items-center justify-between gap-1">
                                <span className={`text-[14px] font-[800] ${basicInfo.regStatus ? 'text-slate-800' : 'text-gray-400'}`}>
                                    {basicInfo.regStatus || (isSyncing ? '同步中' : '待同步')}
                                </span>
                                <div className="bg-[#EEF2FF] text-[#6366F1] text-[9px] px-1.5 py-0.5 rounded-md flex-shrink-0 font-bold">线索</div>
                            </div>
                        </div>
                        */}

                        {/* 股权变更 
                        <div className="bg-[#F8FAFE] rounded-2xl p-3 border border-indigo-50/30">
                            <p className="text-[11px] text-[#94A3B8] font-bold mb-2">股权变更</p>
                            <div className="flex items-center justify-between gap-1">
                                <span className={`text-[14px] font-[800] ${insightStatus.color} truncate`}>
                                    {insightStatus.text}
                                </span>
                                <div className="bg-[#EEF2FF] text-[#6366F1] text-[9px] px-1.5 py-0.5 rounded-md flex-shrink-0 font-bold">线索</div>
                            </div>
                        </div>
                        */}
                    </div>

                    <button 
                         disabled={!hasEnterpriseName || isSyncing}
                         className={`w-full mt-4 flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-dashed border-slate-200 transition-all ${
                            (!hasEnterpriseName || isSyncing) 
                            ? 'opacity-40 grayscale select-none pointer-events-none' 
                            : 'active:scale-[0.98] active:bg-slate-100 cursor-pointer'
                         }`}
                         onClick={(e) => {
                            e.stopPropagation();
                            if (!hasEnterpriseName || isSyncing) return;
                            onNavigateToEnterpriseDetail?.({
                                ...enterpriseInfo,
                                aiInsights: aiInsights
                            });
                         }}
                    >
                        <span className={`text-[14px] font-[800] ${!hasEnterpriseName ? 'text-slate-400' : 'text-slate-700'}`}>查看完整企查查资料</span>
                        <ChevronRight size={18} className={!hasEnterpriseName ? 'text-gray-200' : 'text-gray-300'} />
                    </button>
                </div>
            );
          })()}

          {/* 问题集合 */}
          {(() => {
            const questionList = currentDeal?.questionInfoList || [];
            const totalCount = questionList.length;
            const checkedCount = questionList.filter((q) => q.CHECKED === true).length;
            const qId = (currentDeal as any)?.questionId || currentDeal?.reportTemplate?.id;
            const matchedTemplate = templates.find(t => String(t.id) === String(qId));
            const templateName = matchedTemplate?.templateName || currentDeal?.reportTemplate?.templateName || '默认访谈模板';
            
            console.log('[DueDiligence] Template Selection:', {
                qId,
                found: !!matchedTemplate,
                name: templateName
            });
            
            // 数据源直接取最开始的两条
            const displayQuestions = questionList.slice(0, 2);

            return (
              <div className="bg-white rounded-[32px] p-5 shadow-[0_2px_24px_rgba(0,0,0,0.06)] border border-indigo-50/20">
                {/* Header */}
                <div className="mb-3">
                  <div className="flex items-center gap-1 mb-1">
                    <h3 className="text-[16px] font-bold text-slate-800">问题清单</h3>
                    <div className="flex items-baseline">
                      <span className="text-[14px] font-bold text-slate-800 ml-0.5">{checkedCount}</span>
                      <span className="text-[12px] font-medium text-slate-200">/{totalCount}</span>
                    </div>
                  </div>
                  <p className="text-[13px] text-slate-400 font-medium leading-none">
                    当前问题清单：<span className="text-slate-500">{templateName}</span>
                  </p>
                </div>

                {/* Actions Inline - Medium Size */}
                <div className="flex items-center gap-2.5 mb-3.5">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setTemplateModalVisible(true);
                    }}
                    className="flex items-center border border-[#EBEBF5] text-slate-700 rounded-full px-5 py-1.5 text-[12px] font-[800] active:bg-gray-50 transition-all shadow-sm"
                  >
                    切换清单
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!hasEnterpriseName || isAnalyzingAi) return;
                      handleAiInsight();
                    }}
                    disabled={!hasEnterpriseName || isAnalyzingAi}
                    className={`
                      flex items-center gap-1.5 rounded-full px-5 py-1.5 text-[12px] font-[800] transition-all
                      ${(!hasEnterpriseName || isAnalyzingAi) 
                        ? 'bg-slate-100 text-slate-300 cursor-not-allowed shadow-none border border-slate-50' 
                        : 'bg-[#4B42F5] text-white shadow-[0_4px_10px_rgba(75,66,245,0.25)] active:scale-95'}
                    `}
                  >
                    <span>{aiInsightList.length > 0 ? '再次洞察' : 'AI 洞察'}</span>
                  </button>
                </div>

                {/* Progress Bar Area - Detailed Animation */}
                {isAnalyzingAi && (
                  <div className="bg-[#F2F7FF] rounded-[24px] p-4 mb-4 border border-white shadow-sm overflow-hidden relative">
                    <div className="flex items-center gap-3 mb-3">
                       <div className="w-5 h-5 border-[2.5px] border-indigo-500 border-t-transparent animate-spin rounded-full shrink-0" />
                       <span className="text-[14px] font-bold text-slate-700">问题清单生成中</span>
                    </div>
                    {/* Progress Track */}
                    <div className="h-1.5 w-full bg-white/60 rounded-full overflow-hidden">
                       <div 
                         className="h-full bg-[#4B42F5] rounded-full animate-[progress_5s_ease-in-out_infinite]"
                         style={{ width: '60%' }}
                       />
                    </div>
                    {/* Inline Animation definition */}
                    <style>{`
                       @keyframes progress {
                         0% { transform: translateX(-100%); }
                         50% { transform: translateX(0); }
                         100% { transform: translateX(100%); }
                       }
                    `}</style>
                  </div>
                )}

                {/* Question Preview List */}
                <div className="space-y-2 mb-3">
                  {displayQuestions.map((q, idx) => (
                    <div key={idx} className="bg-[#F8FAFC] rounded-[18px] p-3 border border-white">
                      <p className="text-[13px] text-slate-700 font-medium leading-[1.5] line-clamp-2">
                        {q.questionName}
                      </p>
                    </div>
                  ))}
                  {displayQuestions.length === 0 && (
                    <div className="bg-[#F8FAFC] rounded-[18px] p-4 text-center border border-dashed border-slate-200">
                      <span className="text-[12px] text-slate-400">暂无问题条目</span>
                    </div>
                  )}
                </div>

                {/* Bottom Entry - Compact Premium */}
                <button 
                  onClick={handleNavigateQuestionsThrottled}
                  className="group w-full h-[48px] rounded-[16px] border border-indigo-100/40 bg-gradient-to-r from-white to-[#F8FAFF] flex items-center justify-between px-3.5 active:scale-[0.98] transition-all shadow-sm"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-7.5 h-7.5 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500 group-active:scale-90 transition-transform">
                      <FileText size={16} strokeWidth={2.5} />
                    </div>
                    <span className="text-[13px] font-bold text-slate-700 tracking-tight">
                        {aiInsightList.length > 0 ? '点击查看AI洞察生成的问题清单' : '点击查看完整问题清单'}
                    </span>
                  </div>
                  <div className="w-6 h-6 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:text-indigo-400 transition-colors">
                    <ChevronRight size={14} strokeWidth={3} />
                  </div>
                </button>
              </div>
            );
          })()}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto px-4 pb-3 z-30">
        <button
          onClick={currentDeal?.status === '5' ? handleCancelArchiveThrottled : handleArchiveThrottled}
          className={`w-full h-12 rounded-full font-bold text-lg transition-transform flex items-center justify-center gap-2 ${currentDeal?.status === '5'
            ? 'bg-white text-indigo-600 border border-indigo-200 shadow-md active:scale-95'
            : 'bg-[#4337F1] text-white shadow-lg active:scale-95'
            }`}
        >
          {currentDeal?.status === '5' ? (
            '取消归档'
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
      {/* Template Switch Modal */}
      <TemplateSwitchModal
        visible={templateModalVisible}
        onClose={() => setTemplateModalVisible(false)}
        dealId={currentDeal?.id || ''}
        templates={templates}
        currentQuestionId={(currentDeal as any)?.questionId || currentDeal?.reportTemplate?.id}
        onSelect={handleSwitchTemplate}
      />
    </div>
  );
};

export default DueDiligencePage;