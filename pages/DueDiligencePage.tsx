import React, { useState, useEffect } from 'react';
import { useThrottleFn } from '../hooks/useThrottleFn';
import { ArrowLeft, ChevronRight, Edit2, Mic, Archive, ChevronDown, ChevronUp, RotateCw, FileText, Eye, Download, RefreshCw, MoreHorizontal, Camera, Image, Upload, Plus, Clock, CheckCircle2, AlertCircle, X, Trash2, Loader2 } from 'lucide-react';
import { Toast, Dialog } from 'react-vant';

import { DealRecord, DealReportStatusEnum, SummaryStatusEnum, QuestionInfo, Resource } from '../types';
import { dealService } from '../services/dealService';
import { nativeBridge } from '@/services/nativeBridge';
import { useRecordingStore } from '../store/useRecordingStore';
import VoiceInputModal from '../components/VoiceInputModal';
import QuestionListPicker from '../components/QuestionListPicker';
import config from '../config';
import {markdownToHtml} from "@/utils/markdownToHtml.ts";

const REPORT_GENERATION_STEPS = [
  { key: 'prepare', title: '整理资料', description: '检查访谈记录、补充资料、问题清单和报告样例。', threshold: 0 },
  { key: 'analyze', title: '提取要点', description: '提取访谈回答、资料线索、企业信息和风险提示。', threshold: 25 },
  { key: 'write', title: '撰写报告', description: '按照报告样例生成企业情况、访谈结论和风险分析。', threshold: 55 },
  { key: 'check', title: '检查内容', description: '检查章节完整性、关键信息缺口和可下载文件。', threshold: 82 },
  { key: 'done', title: '生成完成', description: '报告已生成，可以预览或下载。', threshold: 100 },
];

const getReportGenerationStep = (progress: number, status?: DealReportStatusEnum | string) => {
  if (status === DealReportStatusEnum.REPORT_GENERATED) {
    return REPORT_GENERATION_STEPS[REPORT_GENERATION_STEPS.length - 1];
  }

  const safeProgress = Math.max(0, Math.min(100, Math.round(progress || 0)));
  return [...REPORT_GENERATION_STEPS]
    .reverse()
    .find((step) => safeProgress >= step.threshold) || REPORT_GENERATION_STEPS[0];
};

const getReportGenerationMessage = (progress: number, status?: DealReportStatusEnum | string) => {
  if (status === DealReportStatusEnum.REPORT_FAILED) {
    return '可能是网络不稳定，或 AI 服务暂时连不上。当前资料和设置都会保留。';
  }

  if (status === DealReportStatusEnum.REPORT_GENERATED) {
    return '可以预览、下载，或根据最新资料重新生成。';
  }

  const step = getReportGenerationStep(progress, status);
  return step.description;
};

type AiInsightQuestion = {
  id: string;
  category: string;
  issue: string;
  evidence: string;
  question: string;
  source: string;
};

type AiInsightMetric = {
  label: string;
  value: string;
  tone: 'blue' | 'green' | 'amber' | 'red';
};

const getAiInsightText = (item: any, keys: string[], fallback = '') => {
  for (const key of keys) {
    const value = item?.[key];
    if (value !== undefined && value !== null && String(value).trim()) {
      return String(value).trim();
    }
  }
  return fallback;
};

const extractAiInsightList = (payload: any): any[] => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.list)) return payload.list;
  if (Array.isArray(payload?.records)) return payload.records;
  if (Array.isArray(payload?.aiInsights)) return payload.aiInsights;
  if (Array.isArray(payload?.questions)) return payload.questions;
  return [];
};

const normalizeAiInsightQuestions = (list: any[] = []): AiInsightQuestion[] => (
  list
    .map((item, index) => {
      const question = getAiInsightText(item, ['questionContent', 'questionName', 'question', 'content', 'title', 'questionText']);
      if (!question) return null;

      return {
        id: getAiInsightText(item, ['id', 'questionId'], `ai_insight_${index}`),
        category: getAiInsightText(item, ['category', 'questionType', 'type'], '资料分析'),
        issue: getAiInsightText(item, ['issue', 'riskPoint', 'tag'], '需要进一步核实'),
        evidence: getAiInsightText(item, ['evidence', 'reason', 'sourceDesc', 'source'], '结合企业信息、访谈记录和已上传资料生成'),
        question,
        source: getAiInsightText(item, ['source'], 'AI 资料分析'),
      };
    })
    .filter(Boolean) as AiInsightQuestion[]
);

const normalizeRiskSignals = (riskTags: any[] = [], insightQuestions: AiInsightQuestion[] = []) => {
  const tagSignals = riskTags.map((item, index) => {
    if (typeof item === 'string') {
      return { id: `risk_tag_${index}`, title: item, detail: '企业公开信息中识别到的风险标签。' };
    }

    return {
      id: getAiInsightText(item, ['id', 'riskId'], `risk_tag_${index}`),
      title: getAiInsightText(item, ['name', 'label', 'title', 'riskName'], '风险信号'),
      detail: getAiInsightText(item, ['detail', 'description', 'summary', 'content'], '企业公开信息中识别到的风险标签。'),
    };
  });

  const questionSignals = insightQuestions
    .filter((item) => ['法律', '诉讼', '合规', '财务', '经营', '风险', '异常'].some((keyword) => (
      item.category.includes(keyword) || item.issue.includes(keyword) || item.question.includes(keyword)
    )))
    .slice(0, 3)
    .map((item, index) => ({
      id: `risk_question_${index}`,
      title: item.issue,
      detail: item.question,
    }));

  const merged = [...tagSignals, ...questionSignals];
  return merged.filter((item, index, array) => (
    array.findIndex((candidate) => candidate.title === item.title && candidate.detail === item.detail) === index
  ));
};

interface DueDiligencePageProps {
  deal: DealRecord | null;
  onNavigateToRecording: () => void;
  onNavigateToMaterials: () => void;
  onNavigateToQuestions?: () => void;
  onEditInfo?: () => void;
  onChangeTemplate?: () => void;
  onPreviewReport?: (name: string, reportUrl: string, previewUrl: string, showDownloadButton?: boolean) => void;
  onNavigateToHistory?: (dealId: string) => void;
  onOpenInterviewRecord?: (record: any) => void;
  onDealDetailLoaded?: (detail: DealRecord) => void;
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
  onOpenInterviewRecord,
  onDealDetailLoaded,
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
  const [questionPickerMode, setQuestionPickerMode] = useState<'add' | 'replace'>('add');
  const [addQuestionVisible, setAddQuestionVisible] = useState(false);
  const [manualQuestionName, setManualQuestionName] = useState('');
  const [editQuestionVisible, setEditQuestionVisible] = useState(false);
  const [editingQuestionIndex, setEditingQuestionIndex] = useState<number | null>(null);
  const [editingQuestionName, setEditingQuestionName] = useState('');
  const [isSavingManualQuestion, setIsSavingManualQuestion] = useState(false);
  const [isAnalyzingAi, setIsAnalyzingAi] = useState(false);
  const [aiInsightList, setAiInsightList] = useState<any[]>([]);
  const [aiInsightPanelVisible, setAiInsightPanelVisible] = useState(false);
  const [selectedAiInsightIds, setSelectedAiInsightIds] = useState<string[]>([]);
  const [isAcceptingAiInsight, setIsAcceptingAiInsight] = useState(false);
  const [voiceModalInitialContent, setVoiceModalInitialContent] = useState('');
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);
  // 尽调总结本地状态：IDLE/GENERATING/GENERATED/FAILED，驱动按钮和内容区展示
  const [summaryStatus, setSummaryStatus] = useState<SummaryStatusEnum>(SummaryStatusEnum.IDLE);
  const [reportProgress, setReportProgress] = useState(68);
  const [reportProcessVisible, setReportProcessVisible] = useState(false);
  const [fileProgressMap, setFileProgressMap] = useState<Record<string, { progress: number; status: string }>>({});
  const [renameMaterialVisible, setRenameMaterialVisible] = useState(false);
  const [renameMaterialTarget, setRenameMaterialTarget] = useState<Resource | null>(null);
  const [renameMaterialName, setRenameMaterialName] = useState('');
  const [isSavingMaterial, setIsSavingMaterial] = useState(false);
  // 追踪当前 WebSocket 实例，防止重复连接
  const wsRef = React.useRef<WebSocket | null>(null);
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
  const [activeDetailTab, setActiveDetailTab] = useState<'interview' | 'questions' | 'materials' | 'enterprise'>('interview');
  const [isCompressed, setIsCompressed] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

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
  const isDemo = currentDeal?.dealType === 1;
  const isArchived = currentDeal?.status === '5';
  const isReadOnly = isDemo || isArchived;

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

  // 从详情数据同步 summaryStatus 到本地状态（本地状态优先，仅在接口返回后对齐）
  useEffect(() => {
    if (currentDeal?.summaryStatus) {
      setSummaryStatus(currentDeal.summaryStatus as SummaryStatusEnum);
    }
  }, [currentDeal?.summaryStatus]);

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

  // 合并报告和总结的生成状态，任一生成中时保持 WS 连接（避免两个独立状态触发重复连接）
  const wsShouldBeConnected = (currentDeal?.reportStatus === DealReportStatusEnum.REPORT_GENERATING
    || summaryStatus === SummaryStatusEnum.GENERATING) && !!currentDeal?.id;

  // WebSocket 实时接收报告生成状态 & 尽调总结状态更新
  useEffect(() => {
    if (config.isMock) return;

    // 关闭连接：所有生成任务已完成或页面已无关联数据
    if (!wsShouldBeConnected) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      return;
    }

    // 已有活跃连接则复用，防止因依赖变化重复创建
    if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) {
      return;
    }

    const token = localStorage.getItem('zov-user-token') || '';
    const wsBaseUrl = config.apiBaseUrl.replace('https', 'wss').replace('http', 'ws');
    const wsUrl = `${wsBaseUrl}/ws/report-status?dealInstId=${currentDeal.id}&token=${token}`;

    console.log('[WebSocket] Connecting to report status:', wsUrl);

    const socket = new WebSocket(wsUrl);
    wsRef.current = socket;

    socket.onmessage = (event) => {
      console.log('[WebSocket] Received:', event.data);
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;

        // 处理报告状态更新
        if (data.reportStatus) {
          setDealDetail(prev => {
            if (!prev) return null;
            if (prev.reportStatus === data.reportStatus) return prev;
            console.log('[WebSocket] Updating local reportStatus to:', data.reportStatus);
            return { ...prev, reportStatus: data.reportStatus };
          });

          if (data.reportStatus === DealReportStatusEnum.REPORT_GENERATED) {
            setReportProgress(100);
            Toast.success('报告已生成');
            fetchDealDetail();
          } else if (data.reportStatus === DealReportStatusEnum.REPORT_FAILED) {
            setReportProgress(0);
            Toast.fail({ message: '报告生成失败，请稍后重试', duration: 3000 });
            fetchDealDetail();
          }
        }

        const nextProgress = data.percent ?? data.progress ?? data.reportProgress;
        if (nextProgress !== undefined && nextProgress !== null) {
          const numericProgress = Number(nextProgress);
          if (!Number.isNaN(numericProgress)) {
            setReportProgress(Math.max(0, Math.min(99, Math.round(numericProgress))));
          }
        }

        // 处理尽调总结异步生成状态（由后端异步生成后通过 WS 推送）
        // if (data.summaryStatus) {
        //   const newSummaryStatus = data.summaryStatus as string;
        //   console.log('[WebSocket] Updating local summaryStatus to:', newSummaryStatus);
        //
        //   if (newSummaryStatus === SummaryStatusEnum.GENERATED) {
        //     // 生成成功：刷新详情获取内容，再置 GENERATED
        //     dealService.getDealInstDetail(currentDeal.id).then(res => {
        //       if (res.success && res.data) {
        //         setDealDetail(res.data);
        //         onDealDetailLoadedRef.current?.(res.data);
        //       }
        //     }).finally(() => {
        //       setSummaryStatus(SummaryStatusEnum.GENERATED);
        //       Toast.success('尽调总结生成完成');
        //     });
        //   } else if (newSummaryStatus === SummaryStatusEnum.FAILED) {
        //     // 生成失败：直接置 FAILED，刷新详情后 sync effect 对齐服务器状态
        //     setSummaryStatus(SummaryStatusEnum.FAILED);
        //     dealService.getDealInstDetail(currentDeal.id).then(res => {
        //       if (res.success && res.data) {
        //         setDealDetail(res.data);
        //         onDealDetailLoadedRef.current?.(res.data);
        //       }
        //     });
        //     Toast.fail('尽调总结生成失败');
        //   } else if (newSummaryStatus === SummaryStatusEnum.GENERATING) {
        //     // 生成中：同步本地状态（按钮禁用、内容区显示生成中提示）
        //     setSummaryStatus(SummaryStatusEnum.GENERATING);
        //   }
        // }
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
      Toast.info({ message: '网络连接不稳定，生成状态可能会延迟更新', duration: 2500 });
    };

    socket.onclose = (e) => {
      console.log('[WebSocket] Connection closed:', e.code, e.reason);
      wsRef.current = null;
    };

    return () => {
      if (wsRef.current) {
        console.log('[WebSocket] Cleaning up connection');
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [wsShouldBeConnected, currentDeal?.id]);

  useEffect(() => {
    if (config.isMock || !currentDeal?.id) return;

    const token = localStorage.getItem('zov-user-token') || '';
    let wsUrl = '';
    try {
      const url = new URL(config.apiBaseUrl);
      const protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
      const pathBase = url.pathname.replace(/\/api\/?$/, '');
      wsUrl = `${protocol}//${url.host}${pathBase}/ws/connect?dealInstId=${currentDeal.id}&token=${token}`;
    } catch (error) {
      console.error('[FileProgressWS] Failed to parse apiBaseUrl:', error);
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      wsUrl = `${protocol}//${window.location.host}/ws/connect?dealInstId=${currentDeal.id}&token=${token}`;
    }

    let ws: WebSocket | null = null;
    let pingInterval: ReturnType<typeof setInterval> | null = null;

    try {
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        pingInterval = setInterval(() => {
          if (ws?.readyState === WebSocket.OPEN) ws.send('ping');
        }, 15000);
      };

      ws.onmessage = (event) => {
        if (event.data === 'pong') return;
        try {
          const data = JSON.parse(event.data);
          if (data.event !== 'DEAL_FILE_PROGRESS' || !Array.isArray(data.files)) return;

          setFileProgressMap((prev) => {
            const nextMap = { ...prev };
            let changed = false;
            let shouldRefresh = false;

            data.files.forEach((file: any) => {
              if (!file?.id) return;
              const status = String(file.status);
              const progress = Number(file.progress || 0);
              const prevItem = prev[file.id];

              if (!prevItem || prevItem.status !== status || prevItem.progress !== progress) {
                nextMap[file.id] = { status, progress };
                changed = true;
              }

              if (status === '3' && prevItem?.status !== '3') {
                shouldRefresh = true;
              }
            });

            if (shouldRefresh) {
              setTimeout(() => fetchDealDetail(), 800);
            }

            return changed ? nextMap : prev;
          });
        } catch (error) {
          console.warn('[FileProgressWS] Ignore non-progress message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('[FileProgressWS] Error:', error);
      };
    } catch (error) {
      console.error('[FileProgressWS] Connection failed:', error);
    }

    return () => {
      if (pingInterval) clearInterval(pingInterval);
      if (ws) ws.close();
    };
  }, [currentDeal?.id]);

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

  const getFileIconSrc = (fileName: string): string => {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    if (['xlsx', 'xls', 'csv'].includes(ext)) return `${basePath}assets/excel.png`;
    if (['doc', 'docx'].includes(ext)) return `${basePath}assets/word.png`;
    if (ext === 'pdf') return `${basePath}assets/pdf.png`;
    if (['ppt', 'pptx'].includes(ext)) return `${basePath}assets/ppt.png`;
    if (['mp3', 'wav', 'm4a', 'aac', 'flac', 'amr', '3gp', 'ogg'].includes(ext)) return `${basePath}assets/wav.png`;
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(ext)) return `${basePath}assets/image.png`;
    return `${basePath}assets/txt.png`;
  };

  const normalizeFileProgress = (progress?: number) => {
    const safeProgress = Number(progress || 0);
    if (Number.isNaN(safeProgress)) return 0;
    return Math.max(0, Math.min(100, Math.round(safeProgress <= 1 ? safeProgress * 100 : safeProgress)));
  };

  const getMaterialParseState = (resource: Resource) => {
    const progressInfo = fileProgressMap[resource.id];
    const status = progressInfo?.status;
    const progress = normalizeFileProgress(progressInfo?.progress);

    if (status === '4') {
      return {
        type: 'failed' as const,
        label: '解析异常',
        progress,
      };
    }

    if (status === '3' || resource.finishTime || resource.fileCreateFinishTime) {
      return {
        type: 'success' as const,
        label: '解析完成',
        progress: 100,
      };
    }

    if (status && status !== '1') {
      return {
        type: 'parsing' as const,
        label: '解析中',
        progress,
      };
    }

    return {
      type: 'ready' as const,
      label: '可用于报告',
      progress: 0,
    };
  };

  const handleOpenRenameMaterial = (resource: Resource) => {
    const nameParts = resource.fileName.split('.');
    if (nameParts.length > 1) nameParts.pop();
    setRenameMaterialTarget(resource);
    setRenameMaterialName(nameParts.join('.'));
    setRenameMaterialVisible(true);
  };

  const handleConfirmRenameMaterial = async () => {
    if (!renameMaterialTarget || isSavingMaterial) return;

    const nextName = renameMaterialName.trim();
    if (!nextName) {
      Toast.info('文件名不能为空');
      return;
    }

    const nameParts = renameMaterialTarget.fileName.split('.');
    const ext = nameParts.length > 1 ? nameParts.pop() : '';
    const fullName = ext ? `${nextName}.${ext}` : nextName;

    try {
      setIsSavingMaterial(true);
      Toast.loading({ message: '重命名中...', duration: 0 });
      const res = await dealService.renameDealMaterial(renameMaterialTarget.id, fullName);
      Toast.clear();
      if (res.success) {
        Toast.success('重命名成功');
        setRenameMaterialVisible(false);
        setRenameMaterialTarget(null);
        setRenameMaterialName('');
        await fetchDealDetail();
      } else {
        Toast.fail(res.message || '重命名失败');
      }
    } catch (error) {
      Toast.clear();
      console.error('Rename material failed:', error);
      Toast.fail('重命名失败');
    } finally {
      setIsSavingMaterial(false);
    }
  };

  const handleDeleteMaterial = async (resource: Resource) => {
    if (!currentDeal?.id || isSavingMaterial) return;

    try {
      await Dialog.confirm({
        title: '删除资料？',
        message: `确定删除「${resource.fileName || '资料文件'}」吗？删除后无法恢复。`,
        cancelButtonText: '取消',
        confirmButtonText: '确认删除',
        confirmButtonColor: '#DC2626',
      });
    } catch {
      return;
    }

    try {
      setIsSavingMaterial(true);
      Toast.loading({ message: '删除中...', duration: 0 });
      const res = await dealService.deleteDealMaterial(currentDeal.id, resource.id);
      Toast.clear();
      if (res.success) {
        Toast.success('删除成功');
        await fetchDealDetail();
      } else {
        Toast.fail(res.message || '删除失败');
      }
    } catch (error) {
      Toast.clear();
      console.error('Delete material failed:', error);
      Toast.fail('删除失败');
    } finally {
      setIsSavingMaterial(false);
    }
  };

  const handleReparseMaterial = async (resource: Resource) => {
    if (!currentDeal?.id || isSavingMaterial) return;
    try {
      setIsSavingMaterial(true);
      Toast.loading({ message: '重新解析中...', duration: 0 });
      const res = await dealService.reparseFile(currentDeal.id, resource.id);
      Toast.clear();
      if (res.success) {
        Toast.success('已开始重新解析');
        await fetchDealDetail();
      } else {
        Toast.fail(res.message || '操作失败');
      }
    } catch (error) {
      Toast.clear();
      console.error('Reparse material failed:', error);
      Toast.fail('操作失败');
    } finally {
      setIsSavingMaterial(false);
    }
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
        <span style={{ fontFamily: "'PingFang SC', sans-serif", fontSize: '16px', fontWeight: 500, lineHeight: 'normal', letterSpacing: '0em', fontVariationSettings: '"opsz" auto', color: '#0F2848' }}>
          {isRegenerate ? '确认重新生成报告?' : '确认生成报告?'}
        </span>
      ),
      message: (
        <div>
          <p style={{ fontFamily: "'PingFang SC', sans-serif", fontSize: '14px', fontWeight: 'normal', lineHeight: '22px', textAlign: 'center', letterSpacing: '0em', fontVariationSettings: '"opsz" auto', color: '#476285', marginBottom: '10px' }}>
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
      confirmButtonColor: '#2563EB',
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
        setReportProgress(12);
        setDealDetail(prev => {
          const source = prev || currentDeal;
          if (!source) return prev;
          const next = {
            ...source,
            reportStatus: DealReportStatusEnum.REPORT_GENERATING,
          };
          onDealDetailLoadedRef.current?.(next);
          return next;
        });
        Toast.loading({ message: '报告生成中', duration: 0, forbidClick: true });
        const res = await dealService.generateInterviewInstReportAsync(currentDeal.id);
        Toast.clear();

        if (res.success) {
          setReportProgress(68);
          Toast.success('报告生成中');
          window.setTimeout(async () => {
            try {
              const detailRes = await dealService.getDealInstDetail(currentDeal.id);
              if (detailRes.success && detailRes.data) {
                setDealDetail(detailRes.data);
                onDealDetailLoadedRef.current?.(detailRes.data);
                if (detailRes.data.reportStatus === DealReportStatusEnum.REPORT_GENERATED) {
                  setReportProgress(100);
                }
              }
            } catch (error) {
              console.error('Failed to refresh deal detail after report generation:', error);
            }
          }, 4500);
          } else {
            setDealDetail(prev => prev ? { ...prev, reportStatus: currentDeal.reportStatus } : prev);
            setTimeout(() => {
              Toast({ type: 'fail', message: res.message || '报告暂时无法生成', duration: 3000 });
            }, 100);
          }
      } catch (error) {
        Toast.clear();
        setDealDetail(prev => prev ? { ...prev, reportStatus: currentDeal.reportStatus } : prev);
        console.error('Generate report failed:', error);
        setTimeout(() => {
          Toast({ type: 'fail', message: (error as any).message || '报告暂时无法生成', duration: 3000 });
        }, 100);
      }
    }).catch(() => { });
  }, 1000);

  const handleChangeTemplateThrottled = useThrottleFn(() => onChangeTemplate?.(), 1000);

  /** 触发尽调总结异步生成：乐观更新 → 调接口 → 失败回退，结果由 WS 推送 */
  const handleGenerateSummary = async () => {
    if (!currentDeal?.id || summaryStatus === SummaryStatusEnum.GENERATING) return;

    // 乐观更新：立即置为 GENERATING 并清空旧内容，避免用户看到过期数据
    setSummaryStatus(SummaryStatusEnum.GENERATING);
    setDealDetail(prev => prev ? { ...prev, dealSummary: '' } : prev);

    try {
      // 异步提交生成任务，不等待结果，由 WS 推送完成状态
      await dealService.generateInterviewSummary(currentDeal.id);
      Toast.info({ message: '尽调总结生成中', duration: 1500 });
    } catch (error) {
      // 接口调用失败（网络/超时），回退 IDLE 并刷新详情恢复服务器端状态
      setSummaryStatus(SummaryStatusEnum.IDLE);
      const detailRes = await dealService.getDealInstDetail(currentDeal.id);
      if (detailRes.success && detailRes.data) {
        setDealDetail(detailRes.data);
        onDealDetailLoadedRef.current?.(detailRes.data);
      }
    }
  };

  const handleRecordingClickThrottled = useThrottleFn(() => {
    // 检查是否已归档或为 demo 报告（只读）
    if (isReadOnly) {
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

  const openQuestionListPicker = (mode: 'add' | 'replace') => {
    setQuestionPickerMode(mode);
    setTemplateModalVisible(true);
  };

  const handleAddQuestionList = async (questionIds: string[], selectedTemplates: any[] = []) => {
    if (!currentDeal?.id) return;
    if (questionPickerMode === 'replace') {
      const replacementQuestions: QuestionInfo[] = selectedTemplates
        .flatMap((template) => Array.isArray(template.questionList) ? template.questionList : [])
        .map((question: any, index: number) => ({
          ...question,
          id: question.id ? String(question.id) : `temp_replace_${Date.now()}_${index}`,
          questionIndex: index + 1,
          questionAnswer: question.questionAnswer ?? null,
          questionAnswerTime: question.questionAnswerTime ?? null,
          questionStatus: question.questionStatus ?? '0',
          recStatus: question.recStatus ?? '1',
          templateId: String(question.templateId || selectedTemplates[0]?.id || currentDeal.questionId || ''),
          agencyId: question.agencyId ?? '',
          CHECKED: question.CHECKED ?? false,
        }));

      if (replacementQuestions.length === 0) {
        Toast.info('所选清单暂无问题');
        return;
      }

      try {
        await Dialog.confirm({
          title: '确认更换问题清单？',
          message: '更换后将使用新清单覆盖当前问题清单，原清单中的问题将不再保留。',
          cancelButtonText: '暂不更换',
          confirmButtonText: '确认更换',
          confirmButtonColor: '#2563EB',
        });
      } catch {
        throw new Error('replace_question_list_cancelled');
      }

      try {
        Toast.loading({ message: '更换中...', duration: 0 });
        const res = await dealService.createOrUpdateDealInst({
          id: currentDeal.id,
          questionId: questionIds.length === 1 ? questionIds[0] : questionIds.join(','),
          questionInfoList: replacementQuestions,
        });
        Toast.clear();
        if (res.success) {
          const nextDeal = {
            ...currentDeal,
            questionId: questionIds.length === 1 ? questionIds[0] : questionIds.join(','),
            questionInfoList: replacementQuestions,
          };
          setDealDetail(nextDeal as DealRecord);
          onDealDetailLoadedRef.current?.(nextDeal as DealRecord);
          lastSavedQuestionsRef.current = JSON.stringify(replacementQuestions);
          Toast.success('清单已更换');
          await fetchDealDetail();
        } else {
          Toast.fail(res.message || '更换失败');
        }
      } catch (e: any) {
        Toast.clear();
        console.error('Replace question list failed:', e);
        Toast.fail(e.message || '更换失败');
      }
      return;
    }

    try {
      Toast.loading({ message: '添加中...', duration: 0 });
      const res = await dealService.addReportQuestionList({
        id: currentDeal.id,
        questionIds
      });
      if (res.success) {
        Toast.clear();
        await fetchDealDetail();
        Toast.success('清单已更新');
      }
    } catch (e: any) {
      Toast.clear();
      console.error('Add question list failed:', e);
      Toast.fail(e.message || '添加失败');
    }
  };

  const handleOpenManualQuestion = () => {
    if (!currentDeal?.questionInfoList || currentDeal.questionInfoList.length === 0) {
      Toast.info('请先选择问题清单');
      openQuestionListPicker('add');
      return;
    }
    setManualQuestionName('');
    setAddQuestionVisible(true);
  };

  const handleAddManualQuestion = async () => {
    const questionName = manualQuestionName.trim();
    if (!currentDeal?.id || !questionName || isSavingManualQuestion) return;

    const currentQuestions = currentDeal.questionInfoList || [];
    const newQuestion: QuestionInfo = {
      id: `temp_${Date.now()}`,
      questionName,
      questionIndex: currentQuestions.length + 1,
      recStatus: '1',
      questionAnswer: null,
      questionAnswerTime: null,
      questionStatus: '0',
      questionType: '3',
      templateId: String(currentDeal.questionId || currentQuestions[0]?.templateId || ''),
      agencyId: '',
      CHECKED: false,
    };
    const nextQuestions = [...currentQuestions, newQuestion];

    try {
      setIsSavingManualQuestion(true);
      Toast.loading({ message: '保存中...', duration: 0 });
      const res = await dealService.createOrUpdateDealInst({
        id: currentDeal.id,
        questionId: currentDeal.questionId,
        questionInfoList: nextQuestions,
      });
      Toast.clear();
      if (res.success) {
        const nextDeal = { ...currentDeal, questionInfoList: nextQuestions };
        setDealDetail(nextDeal as DealRecord);
        onDealDetailLoadedRef.current?.(nextDeal as DealRecord);
        lastSavedQuestionsRef.current = JSON.stringify(nextQuestions);
        setAddQuestionVisible(false);
        setManualQuestionName('');
        Toast.success('问题已添加');
        await fetchDealDetail();
      } else {
        Toast.fail(res.message || '保存失败');
      }
    } catch (e: any) {
      Toast.clear();
      console.error('Add manual question failed:', e);
      Toast.fail(e.message || '保存失败');
    } finally {
      setIsSavingManualQuestion(false);
    }
  };

  const handleOpenEditQuestion = (question: QuestionInfo, index: number) => {
    setEditingQuestionIndex(index);
    setEditingQuestionName(question.questionName || '');
    setEditQuestionVisible(true);
  };

  const handleEditQuestion = async () => {
    const questionName = editingQuestionName.trim();
    if (!currentDeal?.id || editingQuestionIndex === null || !questionName || isSavingManualQuestion) return;

    const currentQuestions = currentDeal.questionInfoList || [];
    const nextQuestions = currentQuestions.map((question, index) => (
      index === editingQuestionIndex
        ? { ...question, questionName }
        : question
    ));

    try {
      setIsSavingManualQuestion(true);
      Toast.loading({ message: '保存中...', duration: 0 });
      const res = await dealService.createOrUpdateDealInst({
        id: currentDeal.id,
        questionId: currentDeal.questionId,
        questionInfoList: nextQuestions,
      });
      Toast.clear();
      if (res.success) {
        const nextDeal = { ...currentDeal, questionInfoList: nextQuestions };
        setDealDetail(nextDeal as DealRecord);
        onDealDetailLoadedRef.current?.(nextDeal as DealRecord);
        lastSavedQuestionsRef.current = JSON.stringify(nextQuestions);
        setEditQuestionVisible(false);
        setEditingQuestionIndex(null);
        setEditingQuestionName('');
        Toast.success('问题已更新');
        await fetchDealDetail();
      } else {
        Toast.fail(res.message || '保存失败');
      }
    } catch (e: any) {
      Toast.clear();
      console.error('Edit question failed:', e);
      Toast.fail(e.message || '保存失败');
    } finally {
      setIsSavingManualQuestion(false);
    }
  };

  const handleDeleteQuestion = async (index: number) => {
    if (!currentDeal?.id || isSavingManualQuestion) return;

    try {
      await Dialog.confirm({
        title: '删除问题？',
        message: '删除后，该问题将不再出现在当前问题清单中。',
        cancelButtonText: '取消',
        confirmButtonText: '确认删除',
        confirmButtonColor: '#DC2626',
      });
    } catch {
      return;
    }

    const currentQuestions = currentDeal.questionInfoList || [];
    const nextQuestions = currentQuestions
      .filter((_, questionIndex) => questionIndex !== index)
      .map((question, questionIndex) => ({
        ...question,
        questionIndex: questionIndex + 1,
      }));

    try {
      setIsSavingManualQuestion(true);
      Toast.loading({ message: '删除中...', duration: 0 });
      const res = await dealService.createOrUpdateDealInst({
        id: currentDeal.id,
        questionId: currentDeal.questionId,
        questionInfoList: nextQuestions,
      });
      Toast.clear();
      if (res.success) {
        const nextDeal = { ...currentDeal, questionInfoList: nextQuestions };
        setDealDetail(nextDeal as DealRecord);
        onDealDetailLoadedRef.current?.(nextDeal as DealRecord);
        lastSavedQuestionsRef.current = JSON.stringify(nextQuestions);
        Toast.success('问题已删除');
        await fetchDealDetail();
      } else {
        Toast.fail(res.message || '删除失败');
      }
    } catch (e: any) {
      Toast.clear();
      console.error('Delete question failed:', e);
      Toast.fail(e.message || '删除失败');
    } finally {
      setIsSavingManualQuestion(false);
    }
  };

  const handleAiInsight = async () => {
    if (!currentDeal?.id || isAnalyzingAi) return;
    try {
      setIsAnalyzingAi(true);
      setAiInsightPanelVisible(true);
      const res = await dealService.getAiInsight(currentDeal.id, true);
      if (res.success) {
        const nextInsights = extractAiInsightList(res.data);
        const nextNormalizedInsights = normalizeAiInsightQuestions(nextInsights);
        setAiInsightList(nextInsights);
        setSelectedAiInsightIds(nextNormalizedInsights.map((item) => item.id));
        await fetchDealDetail();
        Toast.success(nextInsights.length > 0 ? '资料分析完成' : '暂未生成建议问题');
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

  const handleAcceptAiInsight = async () => {
    const selectedInsights = normalizedAiInsights.filter((item) => selectedAiInsightIds.includes(item.id));
    if (!currentDeal?.id || selectedInsights.length === 0 || isAcceptingAiInsight) return;

    try {
      setIsAcceptingAiInsight(true);
      Toast.loading({ message: '正在加入问题清单...', duration: 0 });
      const res = await dealService.acceptAiInsight(
        currentDeal.id,
        selectedInsights.map((item) => ({ id: item.id, questionContent: item.question })),
      );
      Toast.clear();
      if (res.success) {
        Toast.success(`已加入 ${selectedInsights.length} 个问题`);
        setAiInsightPanelVisible(false);
        await fetchDealDetail();
      } else {
        Toast.fail(res.message || '加入失败');
      }
    } catch (e: any) {
      Toast.clear();
      console.error('Accept AI Insight failed:', e);
      Toast.fail(e.message || '加入失败');
    } finally {
      setIsAcceptingAiInsight(false);
    }
  };

  const handleArchiveThrottled = useThrottleFn(() => {
    Dialog.confirm({
      title: '提示',
      message: '请确认所有访谈工作已完成。归档后仅支持查看和导出报告，不再支持编辑。',
      cancelButtonText: '暂不归档',
      confirmButtonText: '确认归档',
      confirmButtonColor: '#2563EB',
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

  const handleSyncEnterpriseThrottled = useThrottleFn(async () => {
    const name = currentDeal?.companyName?.trim() || basicInfo.name?.trim();
    const code = currentDeal?.creditCode?.trim();

    if (!name && !code) {
      Toast.info('请先补充企业名称');
      onEditInfo?.();
      return;
    }

    if (!currentDeal?.id || isSyncing) return;
    try {
      setIsSyncing(true);
      Toast.loading({ message: '正在同步企业信息', duration: 0 });
      const res = await dealService.syncEnterprise(currentDeal.id);
      Toast.clear();
      if (res.success) {
        Toast.success('已开始同步');
        setTimeout(async () => {
          const basicRes = await dealService.getEnterpriseBasicInfo(currentDeal.id!);
          if (basicRes.success) setEnterpriseInfo(basicRes.data);
        }, 1500);
      } else {
        Toast.info(res.message || '暂时无法同步');
      }
    } catch (e: any) {
      Toast.clear();
      Toast.info(e.message || '暂时无法同步');
    } finally {
      setIsSyncing(false);
    }
  }, 1000);

  const materialList: Resource[] = [
    ...(currentDeal?.resources || []),
    ...(Array.isArray(currentDeal?.supplementary) ? currentDeal.supplementary : []),
  ] as Resource[];
  const materialCount = materialList.length;
  const questionList = currentDeal?.questionInfoList || [];
  const normalizedAiInsights = normalizeAiInsightQuestions(aiInsightList);
  useEffect(() => {
    if (normalizedAiInsights.length > 0 && selectedAiInsightIds.length === 0) {
      setSelectedAiInsightIds(normalizedAiInsights.map((item) => item.id));
    }
  }, [normalizedAiInsights.length, selectedAiInsightIds.length]);
  const enterpriseRiskTags = Array.isArray(basicInfo.riskTags) ? basicInfo.riskTags : [];
  const enterpriseMetrics = basicInfo.operationMetrics || {};
  const enterpriseEquityChanges = (() => {
    const raw = enterpriseInfo?.equityChange || basicInfo.equityChange;
    if (!raw) return [];
    try {
      if (Array.isArray(raw)) return raw;
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      return parsed?.result?.items || parsed?.items || [];
    } catch {
      return [];
    }
  })();
  const enterpriseShareholders = Array.isArray(basicInfo.shareholders) ? basicInfo.shareholders : [];
  const completedInstList = Array.isArray(currentDeal?.interviewInstList)
    ? currentDeal.interviewInstList.filter((record: any) => record.interviewInstStatus && String(record.interviewInstStatus) !== '1')
    : [];
  const hasInterviewRecords = interviewTotalCount > 0
    || ['4', '5'].includes(String(currentDeal?.status || ''))
    || completedInstList.length > 0;
  const companyDisplayName = basicInfo.name || currentDeal?.companyName || currentDeal?.interviewCust || '当前企业';
  const hasCoreEnterpriseInfo = Boolean(basicInfo.name || currentDeal?.companyName || currentDeal?.creditCode);
  const riskSignals = normalizeRiskSignals(enterpriseRiskTags, normalizedAiInsights);
  const aiRiskCount = riskSignals.length;
  const aiInsightMetrics: AiInsightMetric[] = [
    {
      label: '主体信息',
      value: hasCoreEnterpriseInfo ? '已补充' : '待补充',
      tone: hasCoreEnterpriseInfo ? 'green' : 'amber',
    },
    {
      label: '风险信号',
      value: `${aiRiskCount} 项`,
      tone: aiRiskCount >= 3 ? 'red' : aiRiskCount > 0 ? 'amber' : 'green',
    },
    {
      label: '建议问题',
      value: `${normalizedAiInsights.length} 个`,
      tone: normalizedAiInsights.length > 0 ? 'blue' : 'amber',
    },
    {
      label: '资料数量',
      value: `${materialCount} 份`,
      tone: materialCount > 0 ? 'blue' : 'amber',
    },
  ];
  const aiInsightSummaryLines = [
    hasCoreEnterpriseInfo
      ? `${companyDisplayName} 已具备基础企业信息，可用于核验主体、行业、股东和经营口径。`
      : '企业名称或统一社会信用代码仍需补充，否则资料分析的主体判断会不完整。',
    materialCount > 0
      ? `当前已有 ${materialCount} 份资料可用于报告和访谈核验。`
      : '当前还没有补充资料，建议上传营业执照、财报、合同、流水或其他授信材料。',
    normalizedAiInsights.length > 0
      ? `已生成 ${normalizedAiInsights.length} 个建议问题，可选择采纳到问题清单。`
      : '点击 AI 洞察后，会根据企业信息、资料和访谈内容生成建议问题。',
  ];
  const isGenerated = currentDeal?.reportStatus == DealReportStatusEnum.REPORT_GENERATED;
  const isGenerating = currentDeal?.reportStatus == DealReportStatusEnum.REPORT_GENERATING;
  const isFailed = currentDeal?.reportStatus == DealReportStatusEnum.REPORT_FAILED;
  const currentReportStep = getReportGenerationStep(reportProgress, currentDeal?.reportStatus);
  const reportGenerationMessage = getReportGenerationMessage(reportProgress, currentDeal?.reportStatus);
  const reportBasisItems = [
    {
      label: '访谈记录',
      value: `${interviewTotalCount || completedInstList.length} 条`,
      hint: hasInterviewRecords ? '将提取访谈回答和现场结论' : '暂无访谈记录',
    },
    {
      label: '补充资料',
      value: `${materialCount} 份`,
      hint: materialCount > 0 ? '将用于补充报告依据' : '暂无补充资料',
    },
    {
      label: '问题清单',
      value: `${questionList.length} 个`,
      hint: questionList.length > 0 ? '将核对问题覆盖情况' : '暂无问题清单',
    },
  ];
  const reportGenerationTips = isFailed
    ? ['资料和设置不会丢失，可以直接重新生成。', '如果多次失败，建议检查网络后再试。']
    : isGenerated
      ? ['报告已生成，可先预览确认内容。', '资料或访谈更新后，可以重新生成。']
      : ['生成过程中可以返回页面继续查看资料。', '完成后会自动更新为可预览和下载。'];

  let reportCardState: 'notStarted' | 'interviewDone' | 'generating' | 'generated' | 'failed' | 'loading' = 'loading';
  if (isGenerated) {
    reportCardState = 'generated';
  } else if (String(currentDeal?.status) === '1') {
    reportCardState = 'notStarted';
  } else if (['2', '3'].includes(String(currentDeal?.status))) {
    reportCardState = hasInterviewRecords ? 'interviewDone' : 'notStarted';
  } else if (hasInterviewRecords || ['4', '5'].includes(String(currentDeal?.status))) {
    reportCardState = 'interviewDone';
  }
  if (isGenerating) {
    reportCardState = 'generating';
  } else if (isFailed) {
    reportCardState = 'failed';
  }

  const reportCardTitleMap: Record<typeof reportCardState, string> = {
    loading: '',
    generating: '报告生成中',
    generated: '报告已生成',
    failed: '报告生成失败',
    interviewDone: '访谈已完成',
    notStarted: '访谈未开始',
  };
  const reportCardDescMap: Record<typeof reportCardState, string> = {
    loading: '',
    generating: reportGenerationMessage,
    generated: '可以预览、下载，或根据最新资料重新生成。',
    failed: reportGenerationMessage,
    interviewDone: '访谈即报告，小狸智能捕捉核心洞察',
    notStarted: '暂无访谈记录，请先开始访谈',
  };

  return (
    <div className="absolute inset-0 flex flex-col xl-page xl-detail overflow-hidden">
      <input type="file" ref={cameraInputRef} accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />
      <input type="file" ref={galleryInputRef} accept="image/*" className="hidden" onChange={handleFileChange} />
      <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} />

      {showLimitTips && (
        <div className="fixed top-24 left-4 right-4 z-[1000] flex justify-center">
          <div className="bg-black/55 text-white px-5 py-3 rounded-2xl shadow-lg">
            <span className="text-[13px] font-medium">当前有访谈正在录音，暂时不能开启新任务</span>
          </div>
        </div>
      )}

      <div className="px-4 pt-4 pb-2 shrink-0 relative z-50">
        <div className="grid grid-cols-[48px_1fr_48px] items-center gap-2">
          <button onClick={handleBackThrottled} className="xl-icon-btn">
            <ArrowLeft size={21} />
          </button>
          <div className="min-w-0 text-center flex items-center justify-center">
            <h1 className="xl-page-title truncate">{currentDeal?.interviewCust || '尽调详情'}</h1>
          </div>
          <div className="relative">
            <button onClick={() => setShowMoreMenu((value) => !value)} className="xl-icon-btn">
              <MoreHorizontal size={21} />
            </button>
            {showMoreMenu && (
              <div className="absolute right-0 top-12 w-36 rounded-[18px] bg-[#FFFFFF] border border-[#E2EBF5] shadow-[0_16px_36px_rgba(15,40,72,0.14)] overflow-hidden z-[60]">
                <button
                  className="w-full h-11 px-4 flex items-center gap-2 text-[13px] font-normal text-[#0F2848] active:bg-[#2563EB1A]"
                  onClick={() => {
                    setShowMoreMenu(false);
                    handleEditInfoThrottled();
                  }}
                >
                  <Edit2 size={16} /> 名称编辑
                </button>
                {!isDemo && (
                  <button
                    className="w-full h-11 px-4 flex items-center gap-2 text-[13px] font-normal text-[#0F2848] active:bg-[#2563EB1A]"
                    onClick={() => {
                      setShowMoreMenu(false);
                      currentDeal?.status === '5' ? handleCancelArchiveThrottled() : handleArchiveThrottled();
                    }}
                  >
                    <Archive size={16} /> {currentDeal?.status === '5' ? '取消归档' : '归档'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div
        className="flex-1 min-h-0 overflow-y-auto relative z-10 scroll-smooth"
        style={{ WebkitOverflowScrolling: 'touch' }}
        onScroll={(event) => setIsCompressed(event.currentTarget.scrollTop > 150)}
        onWheel={(event) => {
          if (event.deltaY > 24) setIsCompressed(true);
          if (event.deltaY < -24 && event.currentTarget.scrollTop < 12) setIsCompressed(false);
        }}
      >
        <div className="px-4 pb-12 pt-1.5 space-y-3">
          {!isCompressed && (
            <>
              {reportCardState === 'loading' ? (
                <div className="xl-report-state min-h-[136px] flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-[#E2EBF5] border-t-[#2563EB] rounded-full animate-spin" />
                </div>
              ) : (
                <div className={`xl-report-state ${reportCardState === 'generating' ? 'is-processing' : ''} ${reportCardState === 'failed' || reportCardState === 'notStarted' ? 'is-failed' : ''}`}>
                  <div className="xl-report-state-head">
                    <div className="xl-report-illu">
                      <FileText size={24} strokeWidth={2.1} />
                    </div>
                    <div className="min-w-0">
                      <h2>{reportCardTitleMap[reportCardState]}</h2>
                      <p>{reportCardDescMap[reportCardState]}</p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2.5">
                    {reportCardState !== 'notStarted' && (
                      <div className="xl-report-basis-grid">
                        {reportBasisItems.map((item) => (
                          <div key={item.label} className="xl-report-basis-item">
                            <span>{item.label}</span>
                            <strong>{item.value}</strong>
                          </div>
                        ))}
                      </div>
                    )}

                    {isGenerating ? (
                      <div className="space-y-2.5">
                        <div className="xl-report-progress">
                          <div className="flex items-center justify-between gap-3">
                            <span>{currentReportStep.title}</span>
                            <strong>{reportProgress}%</strong>
                          </div>
                          <div className="xl-report-progress-track">
                            <div style={{ width: `${reportProgress}%` }} />
                          </div>
                          <p className="xl-report-progress-desc">{currentReportStep.description}</p>
                        </div>
                        <button
                          onClick={() => setReportProcessVisible(true)}
                          className="xl-report-btn ghost w-full"
                        >
                          <Clock size={15} />
                          <span>查看进度</span>
                        </button>
                      </div>
                    ) : (
                      !isReadOnly && !isFailed && (
                        <button
                          onClick={handleGenerateReportThrottled}
                          className={`xl-report-btn ${isGenerated ? 'soft' : 'primary'} w-full`}
                        >
                          <FileText size={15} />
                          <span>{isGenerated ? '重新生成报告' : '立即生成报告'}</span>
                        </button>
                      )
                    )}

                    {isFailed && !isReadOnly ? (
                      <div className="xl-report-actions two">
                        <button
                          onClick={handleGenerateReportThrottled}
                          className="xl-report-btn primary"
                        >
                          <RefreshCw size={15} />
                          <span>重新生成</span>
                        </button>
                        <button
                          onClick={() => fetchDealDetail()}
                          className="xl-report-btn ghost"
                        >
                          <Clock size={15} />
                          <span>稍后再试</span>
                        </button>
                      </div>
                    ) : isGenerated && !isGenerating ? (
                      <div className={`xl-report-actions ${isReadOnly ? 'two' : 'three'}`}>
                        <button onClick={handleReportPreviewThrottled} className="xl-report-btn ghost vertical">
                          <Eye size={15} />
                          <span>预览报告</span>
                        </button>
                        <button onClick={handleDownloadReportThrottled} className="xl-report-btn ghost vertical">
                          <Download size={15} />
                          <span>立即下载</span>
                        </button>
                        {!isReadOnly && (
                          <button
                            onClick={() => {
                              if (isGenerating) {
                                Toast.info('报告正在生成中，暂不支持更换模板');
                                return;
                              }
                              handleChangeTemplateThrottled?.();
                            }}
                            disabled={isGenerating}
                            className="xl-report-btn ghost vertical disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <RefreshCw size={15} />
                            <span>更换模板</span>
                          </button>
                        )}
                      </div>
                    ) : (
                      !isReadOnly && !isGenerating && (
                        <button
                          onClick={() => {
                            handleChangeTemplateThrottled?.();
                          }}
                          className="xl-report-btn ghost w-full"
                        >
                          <RefreshCw size={15} /> 更换模板
                        </button>
                      )
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          <div className="sticky top-0 z-40 -mx-1 px-1 py-1.5 bg-transparent">
            <div className="xl-segment flex">
              {[
                ['interview', '访谈'],
                ['questions', '问题'],
                ['materials', '资料'],
                ['enterprise', '企业信息'],
              ].map(([key, label]) => (
                <button
                  key={key}
                  className={`flex-1 xl-segment-item ${activeDetailTab === key ? 'is-active' : ''}`}
                  onClick={() => setActiveDetailTab(key as typeof activeDetailTab)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {activeDetailTab === 'interview' && (
            <div className="space-y-2.5">
              {!isReadOnly && (
                <div className="xl-card p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-[13px] bg-[#2563EB1A] border border-[#E2EBF5] text-[#2563EB] flex items-center justify-center shrink-0 shadow-[0_8px_18px_rgba(37,99,235,0.10)]">
                        <Mic size={18} strokeWidth={2.15} />
                      </div>
                      <h3 className="xl-section-title">开始新的访谈</h3>
                    </div>
                    <button onClick={handleRecordingClickThrottled} className="xl-btn-primary min-w-[116px] px-3 flex items-center justify-center gap-1.5">
                      <Mic size={16} /> 开始访谈
                    </button>
                  </div>
                </div>
              )}
              {interviewRecords.length === 0 ? (
                <div className="xl-card-flat p-5 text-center xl-body">暂无访谈记录</div>
              ) : (
                interviewRecords.map((record: any) => (
                  <button
                    key={record.interviewInstId || record.id}
                    className="w-full xl-card-flat p-4 text-left flex items-center justify-between gap-3 active:scale-[0.99] transition-transform min-h-[58px]"
                    onClick={() => onOpenInterviewRecord?.(record)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-[12px] bg-[#2563EB1A] border border-[#E2EBF5] text-[#2563EB] flex items-center justify-center shrink-0">
                        <Mic size={16} strokeWidth={2.15} />
                      </div>
                      <div className="min-w-0">
                      <h3 className="xl-card-title truncate">{record.interviewInstName || record.interviewInstTitle || '访谈记录'}</h3>
                      <p className="xl-meta mt-1">{record.createTime || record.lastModifiedTime || '可查看'}</p>
                      </div>
                    </div>
                    <span className="xl-pill">可查看</span>
                  </button>
                ))
              )}
            </div>
          )}

          {activeDetailTab === 'questions' && (
            <div className="xl-card p-4">
              <div className="flex items-center justify-between mb-2.5">
                <h3 className="xl-section-title">问题清单</h3>
                {!isReadOnly && (
                  <div className="flex flex-wrap justify-end gap-2">
                    {questionList.length === 0 ? (
                      <button onClick={() => openQuestionListPicker('add')} className="xl-btn-primary px-3 min-h-[34px] text-[11px]">选择清单</button>
                    ) : (
                      <>
                        <button onClick={handleOpenManualQuestion} className="xl-btn-ghost px-3 min-h-[34px] text-[11px] inline-flex items-center gap-1">
                          <Plus size={13} />
                          添加问题
                        </button>
                        <button onClick={() => openQuestionListPicker('replace')} className="xl-btn-ghost px-3 min-h-[34px] text-[11px]">更换清单</button>
                        <button onClick={handleAiInsight} disabled={!hasEnterpriseName || isAnalyzingAi} className="xl-btn-primary px-3 min-h-[34px] text-[11px] disabled:opacity-50">{isAnalyzingAi ? '分析中' : '资料分析'}</button>
                      </>
                    )}
                  </div>
                )}
              </div>
              {normalizedAiInsights.length > 0 && (
                <button
                  type="button"
                  onClick={() => setAiInsightPanelVisible(true)}
                  className="mb-3 w-full rounded-[16px] border border-[#D6E4FF] bg-[#F7FAFE] p-3 text-left active:scale-[0.99] transition-transform"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-[#2563EB1A] px-2 py-0.5 text-[10px] font-medium text-[#2563EB]">资料分析</span>
                        <span className="text-[10.5px] text-[#8AA2BF]">{normalizedAiInsights.length} 个建议问题</span>
                      </div>
                      <p className="mt-2 text-[12px] leading-[18px] text-[#0F2848]">
                        已结合企业信息、资料和访谈内容生成核验建议。
                      </p>
                    </div>
                    <ChevronRight size={16} className="mt-1 shrink-0 text-[#8AA2BF]" />
                  </div>
                </button>
              )}
              <div className="space-y-2">
                {questionList.map((q, idx) => (
                  <div key={q.id || idx} className="xl-card-flat p-3 flex items-start gap-2.5">
                    <div className="flex min-w-0 flex-1 items-start gap-2.5">
                      <span className="mt-0.5 w-5 h-5 rounded-[8px] bg-[#F7FAFE] border border-[#E2EBF5] text-[#2563EB] text-[10px] leading-none font-medium flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <p className="min-w-0 flex-1 text-[12px] leading-[17px] font-normal text-[#0F2848]">{q.questionName}</p>
                    </div>
                    {!isReadOnly && (
                      <div className="ml-1 flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          aria-label="编辑问题"
                          onClick={() => handleOpenEditQuestion(q, idx)}
                          className="h-8 w-8 rounded-[10px] border border-[#E2EBF5] bg-[#FFFFFF] text-[#476285] flex items-center justify-center active:scale-95"
                        >
                          <Edit2 size={14} strokeWidth={1.9} />
                        </button>
                        <button
                          type="button"
                          aria-label="删除问题"
                          onClick={() => handleDeleteQuestion(idx)}
                          className="h-8 w-8 rounded-[10px] border border-[#FAD1D1] bg-[#FFF7F7] text-[#DC2626] flex items-center justify-center active:scale-95"
                        >
                          <Trash2 size={14} strokeWidth={1.9} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                {questionList.length === 0 && (
                  <div className="xl-card-flat p-4 text-center">
                    <p className="xl-body">请先选择问题清单</p>
                    {!isReadOnly && (
                      <button onClick={() => openQuestionListPicker('add')} className="mt-3 xl-btn-ghost px-4 min-h-[34px] text-[11px]">选择问题清单</button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeDetailTab === 'materials' && (
            <div className="space-y-2.5">
              {!isReadOnly && (
                <div className="xl-card p-4">
                  <div className="grid grid-cols-4 gap-2.5 text-center">
                    {[
                      [Camera, '相机', () => cameraInputRef.current?.click(), 'bg-[#2563EB1A] border-[#E2EBF5] text-[#2563EB]'],
                      [Image, '相册', () => galleryInputRef.current?.click(), 'bg-[#2563EB1A] border-[#E2EBF5] text-[#2563EB]'],
                      [Upload, '文件', () => fileInputRef.current?.click(), 'bg-[#2563EB1A] border-[#E2EBF5] text-[#2563EB]'],
                      [Mic, '语音录入', () => setVoiceModalVisible(true), 'bg-[#2563EB1A] border-[#E2EBF5] text-[#2563EB]'],
                    ].map(([Icon, label, action, colorClass]: any) => (
                      <button key={label} onClick={action} className="min-h-[62px] rounded-[15px] bg-[#FFFFFF] border border-[#E2EBF5] flex flex-col items-center justify-center gap-1.5 text-[#0F2848] active:scale-95 transition-transform">
                        <span className={`w-8 h-8 rounded-[11px] border flex items-center justify-center ${colorClass}`}>
                          <Icon size={17} />
                        </span>
                        <span className="text-[10.5px] font-normal text-[#476285]">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="xl-card p-4">
                <div className="space-y-2">
                  {materialList.map((item) => {
                    const parseState = getMaterialParseState(item);
                    const canRename = item.type !== '4';
                    return (
                      <div key={item.id} className="xl-card-flat p-3">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-[13px] border border-[#E2EBF5] bg-[#F7FAFE] flex items-center justify-center shrink-0 overflow-hidden">
                            <img
                              src={getFileIconSrc(item.fileName || item.name || '')}
                              alt=""
                              className="h-7 w-7 object-contain"
                            />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex min-w-0 items-center gap-2">
                              <h3 className="xl-card-title truncate">{item.fileName || item.name || '资料文件'}</h3>
                              {parseState.type === 'success' && <CheckCircle2 size={14} className="shrink-0 text-[#10B981]" />}
                              {parseState.type === 'failed' && <AlertCircle size={14} className="shrink-0 text-[#DC2626]" />}
                              {parseState.type === 'parsing' && <Loader2 size={14} className="shrink-0 animate-spin text-[#2563EB]" />}
                            </div>

                            <div className="mt-1 flex flex-wrap items-center gap-1.5">
                              <span className={`rounded-full px-2 py-0.5 text-[10px] leading-[14px] ${
                                parseState.type === 'success'
                                  ? 'bg-[#ECFDF5] text-[#047857]'
                                  : parseState.type === 'failed'
                                    ? 'bg-[#FEF2F2] text-[#DC2626]'
                                    : parseState.type === 'parsing'
                                      ? 'bg-[#EFF6FF] text-[#2563EB]'
                                      : 'bg-[#F7FAFE] text-[#476285]'
                              }`}>
                                {parseState.label}
                              </span>
                              {item.fileTags && (
                                (Array.isArray(item.fileTags) ? item.fileTags : String(item.fileTags).split(','))
                                  .slice(0, 2)
                                  .map((tag: string) => tag.trim() && (
                                    <span key={tag} className="rounded-full bg-[#F7FAFE] px-2 py-0.5 text-[10px] leading-[14px] text-[#476285]">
                                      {tag.trim()}
                                    </span>
                                  ))
                              )}
                            </div>

                            {parseState.type === 'parsing' && (
                              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#E2EBF5]">
                                <div
                                  className="h-full rounded-full bg-[#2563EB] transition-all"
                                  style={{ width: `${Math.max(8, parseState.progress)}%` }}
                                />
                              </div>
                            )}

                            {parseState.type === 'failed' && (
                              <button
                                type="button"
                                onClick={() => handleReparseMaterial(item)}
                                className="mt-2 text-[11px] font-medium text-[#2563EB]"
                              >
                                重新解析
                              </button>
                            )}
                          </div>

                          {!isReadOnly && (
                            <div className="flex shrink-0 items-center gap-1">
                              {canRename && (
                                <button
                                  type="button"
                                  aria-label="重命名资料"
                                  onClick={() => handleOpenRenameMaterial(item)}
                                  className="h-8 w-8 rounded-[10px] border border-[#E2EBF5] bg-white text-[#476285] flex items-center justify-center active:scale-95"
                                >
                                  <Edit2 size={14} strokeWidth={1.9} />
                                </button>
                              )}
                              <button
                                type="button"
                                aria-label="删除资料"
                                onClick={() => handleDeleteMaterial(item)}
                                className="h-8 w-8 rounded-[10px] border border-[#FAD1D1] bg-[#FFF7F7] text-[#DC2626] flex items-center justify-center active:scale-95"
                              >
                                <Trash2 size={14} strokeWidth={1.9} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {materialCount === 0 && <div className="xl-card-flat p-4 text-center xl-body">暂无资料</div>}
                </div>
              </div>
            </div>
          )}

          {activeDetailTab === 'enterprise' && (
            <div className="xl-card p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="xl-section-title">企业信息</h3>
                {!isReadOnly && (
                  <button onClick={handleSyncEnterpriseThrottled} disabled={isSyncing} className="xl-btn-ghost px-3 min-h-[36px] text-[12px] disabled:opacity-50">
                    {isSyncing ? '同步中' : '同步'}
                  </button>
                )}
              </div>
              <div className="xl-enterprise-grid grid grid-cols-2 gap-3">
                <div className="xl-card-flat p-3 col-span-2">
                  <p className="xl-meta mb-1.5">企业名称</p>
                  <p className="xl-card-title truncate">{basicInfo.name || currentDeal?.companyName || '待补充'}</p>
                </div>
                <div className="xl-card-flat p-3">
                  <p className="xl-meta mb-1.5">企业状态</p>
                  <p className="xl-card-title truncate">{basicInfo.regStatus || '待补充'}</p>
                </div>
                <div className="xl-card-flat p-3">
                  <p className="xl-meta mb-1.5">法定代表人</p>
                  <p className="xl-card-title truncate">{basicInfo.legalPersonName || '待补充'}</p>
                </div>
                <div className="xl-card-flat p-3">
                  <p className="xl-meta mb-1.5">注册资本</p>
                  <p className="xl-card-title truncate">{basicInfo.regCapital || '待补充'}</p>
                </div>
                <div className="xl-card-flat p-3">
                  <p className="xl-meta mb-1.5">人员规模</p>
                  <p className="xl-card-title truncate">{basicInfo.staffNumRange || '待补充'}</p>
                </div>
                <div className="xl-card-flat p-3 col-span-2">
                  <p className="xl-meta mb-1.5">统一社会信用代码</p>
                  <p className="xl-card-title truncate">{basicInfo.creditCode || currentDeal?.creditCode || '待补充'}</p>
                </div>
                <div className="xl-card-flat p-3 col-span-2">
                  <p className="xl-meta mb-1.5">所属行业</p>
                  <p className="xl-card-title">{basicInfo.industry || '待补充'}</p>
                </div>
                <div className="xl-card-flat p-3 col-span-2">
                  <p className="xl-meta mb-1.5">注册地址</p>
                  <p className="text-[12px] leading-[17px] font-normal text-[#0F2848]">{basicInfo.regLocation || '待补充'}</p>
                </div>
                <div className="xl-card-flat p-3 col-span-2">
                  <p className="xl-meta mb-2">风险标签</p>
                  {enterpriseRiskTags.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {enterpriseRiskTags.map((tag: string) => (
                        <span key={tag} className="xl-pill">{tag}</span>
                      ))}
                    </div>
                  ) : (
                    <p className="xl-card-title">待补充</p>
                  )}
                </div>
                <div className="xl-card-flat p-3">
                  <p className="xl-meta mb-1.5">收入增长</p>
                  <p className="xl-card-title truncate">{enterpriseMetrics.revenueGrowth || '待补充'}</p>
                </div>
                <div className="xl-card-flat p-3">
                  <p className="xl-meta mb-1.5">应收周转</p>
                  <p className="xl-card-title truncate">{enterpriseMetrics.receivableTurnoverDays || '待补充'}</p>
                </div>
                <div className="xl-card-flat p-3">
                  <p className="xl-meta mb-1.5">在手合同</p>
                  <p className="xl-card-title truncate">{enterpriseMetrics.contractBacklog || '待补充'}</p>
                </div>
                <div className="xl-card-flat p-3">
                  <p className="xl-meta mb-1.5">成立日期</p>
                  <p className="xl-card-title truncate">{basicInfo.estiblishTime || '待补充'}</p>
                </div>
                <div className="xl-card-flat p-3 col-span-2">
                  <p className="xl-meta mb-1.5">公司类型</p>
                  <p className="text-[12px] leading-[17px] font-normal text-[#0F2848]">{basicInfo.companyOrgType || '待补充'}</p>
                </div>
                <div className="xl-card-flat p-3 col-span-2">
                  <p className="xl-meta mb-1.5">登记机关</p>
                  <p className="text-[12px] leading-[17px] font-normal text-[#0F2848]">{basicInfo.regInstitute || '待补充'}</p>
                </div>
                <div className="xl-card-flat p-3">
                  <p className="xl-meta mb-1.5">注册号</p>
                  <p className="xl-card-title truncate">{basicInfo.regNumber || '待补充'}</p>
                </div>
                <div className="xl-card-flat p-3">
                  <p className="xl-meta mb-1.5">组织机构代码</p>
                  <p className="xl-card-title truncate">{basicInfo.orgNumber || '待补充'}</p>
                </div>
                <div className="xl-card-flat p-3 col-span-2">
                  <p className="xl-meta mb-2">主要股东</p>
                  {enterpriseShareholders.length > 0 ? (
                    <div className="space-y-2">
                      {enterpriseShareholders.map((holder: any, idx: number) => (
                        <div key={`${holder.name}-${idx}`} className="flex items-center justify-between gap-3 text-[12px]">
                          <span className="font-normal text-[#0F2848] truncate">{holder.name}</span>
                          <span className="shrink-0 text-[#2563EB] font-semibold">{holder.ratio}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="xl-card-title">待补充</p>
                  )}
                </div>
                <div className="xl-card-flat p-3 col-span-2">
                  <p className="xl-meta mb-2">股权变更</p>
                  {enterpriseEquityChanges.length > 0 ? (
                    <div className="space-y-2.5">
                      {enterpriseEquityChanges.map((change: any, idx: number) => (
                        <div key={`${change.investor_name}-${idx}`} className="rounded-[12px] bg-[#FFFFFF] border border-[#E2EBF5]/70 p-2.5">
                          <div className="flex items-start justify-between gap-3">
                            <span className="text-[12px] font-medium text-[#0F2848] leading-[17px]">{change.investor_name || '股权变更'}</span>
                            <span className="text-[10.5px] text-[#8AA2BF] font-normal shrink-0">{change.change_time || '-'}</span>
                          </div>
                          <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
                            <div className="rounded-[10px] bg-[#F7FAFE] px-2 py-1.5">
                              <span className="text-[#8AA2BF]">变更前 </span>
                              <span className="font-medium text-[#476285]">{change.ratio_before || '-'}</span>
                            </div>
                            <div className="rounded-[10px] bg-[#2563EB1A] px-2 py-1.5">
                              <span className="text-[#2563EB]">变更后 </span>
                              <span className="font-semibold text-[#2563EB]">{change.ratio_after || '-'}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="xl-card-title">暂无股权变更</p>
                  )}
                </div>
                <div className="xl-card-flat p-3 col-span-2">
                  <p className="xl-meta mb-1.5">经营范围</p>
                  <p className="text-[12px] leading-[18px] font-normal text-[#0F2848]">{basicInfo.businessScope || '待补充'}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {aiInsightPanelVisible && (
        <div
          className="fixed inset-0 z-[72] flex items-end justify-center bg-black/35"
          onClick={() => !isAnalyzingAi && !isAcceptingAiInsight && setAiInsightPanelVisible(false)}
        >
          <div
            className="flex max-h-[86vh] w-full max-w-md flex-col rounded-t-[24px] bg-[#FFFFFF] px-5 pb-6 pt-4 shadow-[0_-16px_40px_rgba(15,40,72,0.16)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[#D8E3F2]" />
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-[16px] font-medium text-[#0F2848]">资料分析</h3>
                  {isAnalyzingAi && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#2563EB1A] px-2 py-0.5 text-[10px] text-[#2563EB]">
                      <RefreshCw size={10} className="animate-spin" />
                      分析中
                    </span>
                  )}
                </div>
                <p className="mt-1 text-[12px] leading-[18px] text-[#476285]">
                  用于快速判断资料缺口、风险线索和下一步访谈问题。
                </p>
              </div>
              <button
                type="button"
                aria-label="关闭资料分析"
                onClick={() => setAiInsightPanelVisible(false)}
                disabled={isAnalyzingAi || isAcceptingAiInsight}
                className="h-8 w-8 shrink-0 rounded-full bg-[#F7FAFE] text-[#476285] flex items-center justify-center active:scale-95 disabled:opacity-50"
              >
                <X size={16} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-2">
                {aiInsightMetrics.map((metric) => (
                  <div key={metric.label} className={`xl-ai-metric is-${metric.tone}`}>
                    <span>{metric.label}</span>
                    <strong>{metric.value}</strong>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-[16px] border border-[#E2EBF5] bg-[#FFFFFF] p-3">
                <div className="mb-2 flex items-center gap-2">
                  <FileText size={14} className="text-[#2563EB]" />
                  <span className="text-[12px] font-medium text-[#0F2848]">分析摘要</span>
                </div>
                <div className="space-y-2">
                  {aiInsightSummaryLines.map((line, index) => (
                    <p key={index} className="text-[12px] leading-[18px] text-[#476285]">{line}</p>
                  ))}
                </div>
              </div>

              <div className="mt-4 rounded-[16px] border border-[#E2EBF5] bg-[#FFFFFF] p-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle size={14} className={riskSignals.length > 0 ? 'text-[#D97706]' : 'text-[#8AA2BF]'} />
                    <span className="text-[12px] font-medium text-[#0F2848]">风险信号</span>
                  </div>
                  <span className="text-[10.5px] text-[#8AA2BF]">{riskSignals.length} 项</span>
                </div>
                {riskSignals.length > 0 ? (
                  <div className="space-y-2">
                    {riskSignals.slice(0, 4).map((risk) => (
                      <div key={risk.id} className="rounded-[12px] bg-[#FFF7ED] px-3 py-2">
                        <p className="text-[12px] font-medium leading-[17px] text-[#92400E]">{risk.title}</p>
                        <p className="mt-1 text-[11.5px] leading-[17px] text-[#B45309]">{risk.detail}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[12px] leading-[18px] text-[#476285]">
                    暂未识别到明确风险信号，建议继续结合访谈和补充资料核验。
                  </p>
                )}
              </div>

              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="text-[12px] font-medium text-[#0F2848]">建议访谈问题</span>
                  <span className="text-[10.5px] text-[#8AA2BF]">
                    已选 {selectedAiInsightIds.length}/{normalizedAiInsights.length}
                  </span>
                </div>
                {isAnalyzingAi && normalizedAiInsights.length === 0 ? (
                  <div className="rounded-[16px] border border-dashed border-[#D6E4FF] bg-[#F7FAFE] p-5 text-center">
                    <RefreshCw size={20} className="mx-auto animate-spin text-[#2563EB]" />
                    <p className="mt-3 text-[12px] text-[#476285]">正在分析企业信息和资料...</p>
                  </div>
                ) : normalizedAiInsights.length > 0 ? (
                  <div className="space-y-2.5">
                    {normalizedAiInsights.map((item, index) => {
                      const isSelected = selectedAiInsightIds.includes(item.id);
                      return (
                      <button
                        key={`${item.id}-${index}`}
                        type="button"
                        onClick={() => {
                          setSelectedAiInsightIds((previous) => (
                            previous.includes(item.id)
                              ? previous.filter((id) => id !== item.id)
                              : [...previous, item.id]
                          ));
                        }}
                        className={`w-full rounded-[16px] border p-3 text-left transition-transform active:scale-[0.99] ${
                          isSelected ? 'border-[#2563EB] bg-[#F7FAFE]' : 'border-[#E2EBF5] bg-[#FFFFFF]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                            <span className="rounded-full bg-[#2563EB1A] px-2 py-0.5 text-[10px] font-medium text-[#2563EB]">{item.category}</span>
                            <span className="rounded-full bg-[#FFF7ED] px-2 py-0.5 text-[10px] font-medium text-[#D97706]">{item.issue}</span>
                          </div>
                          <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-[7px] border ${
                            isSelected ? 'border-[#2563EB] bg-[#2563EB] text-white' : 'border-[#CBD7E5] bg-white text-transparent'
                          }`}>
                            <CheckCircle2 size={13} />
                          </span>
                        </div>
                        <p className="mt-2 text-[13px] leading-[19px] font-medium text-[#0F2848]">{item.question}</p>
                        <p className="mt-2 text-[11.5px] leading-[17px] text-[#8AA2BF]">{item.evidence}</p>
                      </button>
                    );
                    })}
                  </div>
                ) : (
                  <div className="rounded-[16px] border border-dashed border-[#E2EBF5] bg-[#F7FAFE] p-5 text-center">
                    <p className="text-[12px] leading-[18px] text-[#476285]">还没有生成资料分析，点击下方按钮开始分析。</p>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={handleAiInsight}
                disabled={!hasEnterpriseName || isAnalyzingAi || isAcceptingAiInsight}
                className="h-11 flex-1 rounded-[999px] border border-[#E2EBF5] bg-[#FFFFFF] text-[14px] font-medium text-[#2563EB] active:bg-[#F7FAFE] disabled:opacity-50"
              >
                {normalizedAiInsights.length > 0 ? '重新分析' : '开始分析'}
              </button>
              <button
                type="button"
                onClick={handleAcceptAiInsight}
                disabled={selectedAiInsightIds.length === 0 || isAnalyzingAi || isAcceptingAiInsight}
                className="h-11 flex-1 rounded-[999px] bg-[#2563EB] text-[14px] font-medium text-white shadow-[0_8px_20px_rgba(37,99,235,0.18)] active:scale-[0.98] disabled:bg-[#E2EBF5] disabled:text-[#8AA2BF] disabled:shadow-none"
              >
                {isAcceptingAiInsight ? '加入中' : `加入已选 ${selectedAiInsightIds.length} 个`}
              </button>
            </div>
          </div>
        </div>
      )}

      {reportProcessVisible && (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/35"
          onClick={() => setReportProcessVisible(false)}
        >
          <div
            className="flex max-h-[86vh] w-full max-w-md flex-col rounded-t-[24px] bg-[#FFFFFF] px-5 pb-6 pt-4 shadow-[0_-16px_40px_rgba(15,40,72,0.16)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[#D8E3F2]" />
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-[16px] font-medium text-[#0F2848]">
                  {isFailed ? '报告生成失败' : isGenerated ? '报告已生成' : '报告生成中'}
                </h3>
                <p className="mt-1 text-[12px] leading-[18px] text-[#476285]">{reportGenerationMessage}</p>
              </div>
              <button
                type="button"
                aria-label="关闭报告生成进度"
                onClick={() => setReportProcessVisible(false)}
                className="h-8 w-8 shrink-0 rounded-full bg-[#F7FAFE] text-[#476285] flex items-center justify-center active:scale-95"
              >
                <X size={16} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            <div className="xl-report-process-summary">
              <div>
                <span>当前进度</span>
                <strong>{isGenerated ? 100 : reportProgress}%</strong>
              </div>
              <div>
                <span>当前步骤</span>
                <strong>{isFailed ? '生成失败' : currentReportStep.title}</strong>
              </div>
              <div>
                <span>生成内容</span>
                <strong>尽调报告</strong>
              </div>
              <div>
                <span>完成后</span>
                <strong>{isGenerated ? '可预览下载' : '自动更新状态'}</strong>
              </div>
            </div>

            <div className="mt-4 rounded-[16px] border border-[#E2EBF5] bg-[#F7FAFE] p-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-[12px] font-medium text-[#0F2848]">本次生成依据</span>
                <span className="text-[10.5px] text-[#8AA2BF]">用于组织报告内容</span>
              </div>
              <div className="space-y-2">
                {reportBasisItems.map((item) => (
                  <div key={item.label} className="flex items-start justify-between gap-3 rounded-[12px] bg-white px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-[12px] font-medium leading-[17px] text-[#0F2848]">{item.label}</p>
                      <p className="mt-0.5 text-[11px] leading-[16px] text-[#8AA2BF]">{item.hint}</p>
                    </div>
                    <span className="shrink-0 text-[12px] font-semibold text-[#2563EB]">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {REPORT_GENERATION_STEPS.map((step, index) => {
                const stepDone = isGenerated || (!isFailed && reportProgress >= step.threshold && step.threshold < currentReportStep.threshold);
                const stepActive = !isGenerated && !isFailed && step.key === currentReportStep.key;
                return (
                  <div key={step.key} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`xl-report-step-dot ${stepDone ? 'is-done' : ''} ${stepActive ? 'is-active' : ''} ${isFailed && step.key === currentReportStep.key ? 'is-failed' : ''}`}>
                        {stepDone || isGenerated ? (
                          <CheckCircle2 size={14} />
                        ) : isFailed && step.key === currentReportStep.key ? (
                          <AlertCircle size={14} />
                        ) : stepActive ? (
                          <RefreshCw size={13} className="animate-spin" />
                        ) : (
                          <span />
                        )}
                      </div>
                      {index < REPORT_GENERATION_STEPS.length - 1 && <div className="xl-report-step-line" />}
                    </div>
                    <div className="min-w-0 pb-1">
                      <p className={`text-[13px] leading-[18px] font-medium ${stepActive || stepDone || isGenerated ? 'text-[#0F2848]' : 'text-[#8AA2BF]'}`}>
                        {step.title}
                      </p>
                      <p className="mt-0.5 text-[11.5px] leading-[17px] text-[#8AA2BF]">{step.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 rounded-[16px] border border-[#E2EBF5] bg-[#FFFFFF] p-3">
              <div className="mb-2 flex items-center gap-2">
                <AlertCircle size={14} className={isFailed ? 'text-[#DC2626]' : 'text-[#2563EB]'} />
                <span className="text-[12px] font-medium text-[#0F2848]">提示</span>
              </div>
              <div className="space-y-1.5">
                {reportGenerationTips.map((tip) => (
                  <p key={tip} className="text-[11.5px] leading-[17px] text-[#476285]">{tip}</p>
                ))}
              </div>
            </div>

            </div>

            <div className="mt-5 flex shrink-0 gap-3">
              {isFailed ? (
                <>
                  <button
                    type="button"
                    onClick={() => setReportProcessVisible(false)}
                    className="h-11 flex-1 rounded-[999px] border border-[#E2EBF5] bg-[#FFFFFF] text-[14px] font-medium text-[#476285] active:bg-[#F7FAFE]"
                  >
                    稍后再试
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setReportProcessVisible(false);
                      handleGenerateReportThrottled();
                    }}
                    className="h-11 flex-1 rounded-[999px] bg-[#2563EB] text-[14px] font-medium text-white shadow-[0_8px_20px_rgba(37,99,235,0.18)] active:scale-[0.98]"
                  >
                    重新生成
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setReportProcessVisible(false)}
                  className="h-11 flex-1 rounded-[999px] bg-[#2563EB] text-[14px] font-medium text-white shadow-[0_8px_20px_rgba(37,99,235,0.18)] active:scale-[0.98]"
                >
                  知道了
                </button>
              )}
            </div>
          </div>
        </div>
      )}

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
      {addQuestionVisible && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/35"
          onClick={() => !isSavingManualQuestion && setAddQuestionVisible(false)}
        >
          <div
            className="w-full max-w-md rounded-t-[24px] bg-[#FFFFFF] px-5 pb-6 pt-4 shadow-[0_-16px_40px_rgba(15,40,72,0.16)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[#D8E3F2]" />
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-[16px] font-medium text-[#0F2848]">添加问题</h3>
              <span className="text-[12px] text-[#8AA2BF]">{manualQuestionName.trim().length}/80</span>
            </div>
            <textarea
              value={manualQuestionName}
              onChange={(event) => setManualQuestionName(event.target.value.slice(0, 80))}
              placeholder="请输入需要补充的问题"
              rows={4}
              autoFocus
              className="w-full resize-none rounded-[16px] border border-[#E2EBF5] bg-[#F7FAFE] px-4 py-3 text-[14px] leading-[20px] text-[#0F2848] outline-none placeholder:text-[#8AA2BF] focus:border-[#4C8BF5] focus:ring-4 focus:ring-[#2563EB1A]"
            />
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                disabled={isSavingManualQuestion}
                onClick={() => setAddQuestionVisible(false)}
                className="h-11 flex-1 rounded-[999px] border border-[#E2EBF5] bg-[#FFFFFF] text-[14px] font-medium text-[#476285] active:bg-[#F7FAFE] disabled:opacity-50"
              >
                取消
              </button>
              <button
                type="button"
                disabled={!manualQuestionName.trim() || isSavingManualQuestion}
                onClick={handleAddManualQuestion}
                className="h-11 flex-1 rounded-[999px] bg-[#2563EB] text-[14px] font-medium text-white shadow-[0_8px_20px_rgba(37,99,235,0.18)] active:scale-[0.98] disabled:bg-[#E2EBF5] disabled:text-[#8AA2BF] disabled:shadow-none"
              >
                {isSavingManualQuestion ? '保存中' : '确认添加'}
              </button>
            </div>
          </div>
        </div>
      )}
      {editQuestionVisible && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/35"
          onClick={() => !isSavingManualQuestion && setEditQuestionVisible(false)}
        >
          <div
            className="w-full max-w-md rounded-t-[24px] bg-[#FFFFFF] px-5 pb-6 pt-4 shadow-[0_-16px_40px_rgba(15,40,72,0.16)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[#D8E3F2]" />
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-[16px] font-medium text-[#0F2848]">编辑问题</h3>
              <span className="text-[12px] text-[#8AA2BF]">{editingQuestionName.trim().length}/80</span>
            </div>
            <textarea
              value={editingQuestionName}
              onChange={(event) => setEditingQuestionName(event.target.value.slice(0, 80))}
              placeholder="请输入问题内容"
              rows={4}
              autoFocus
              className="w-full resize-none rounded-[16px] border border-[#E2EBF5] bg-[#F7FAFE] px-4 py-3 text-[14px] leading-[20px] text-[#0F2848] outline-none placeholder:text-[#8AA2BF] focus:border-[#4C8BF5] focus:ring-4 focus:ring-[#2563EB1A]"
            />
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                disabled={isSavingManualQuestion}
                onClick={() => setEditQuestionVisible(false)}
                className="h-11 flex-1 rounded-[999px] border border-[#E2EBF5] bg-[#FFFFFF] text-[14px] font-medium text-[#476285] active:bg-[#F7FAFE] disabled:opacity-50"
              >
                取消
              </button>
              <button
                type="button"
                disabled={!editingQuestionName.trim() || isSavingManualQuestion}
                onClick={handleEditQuestion}
                className="h-11 flex-1 rounded-[999px] bg-[#2563EB] text-[14px] font-medium text-white shadow-[0_8px_20px_rgba(37,99,235,0.18)] active:scale-[0.98] disabled:bg-[#E2EBF5] disabled:text-[#8AA2BF] disabled:shadow-none"
              >
                {isSavingManualQuestion ? '保存中' : '保存修改'}
              </button>
            </div>
          </div>
        </div>
      )}
      {renameMaterialVisible && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/35"
          onClick={() => !isSavingMaterial && setRenameMaterialVisible(false)}
        >
          <div
            className="w-full max-w-md rounded-t-[24px] bg-[#FFFFFF] px-5 pb-6 pt-4 shadow-[0_-16px_40px_rgba(15,40,72,0.16)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[#D8E3F2]" />
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-[16px] font-medium text-[#0F2848]">文件重命名</h3>
              <span className="text-[12px] text-[#8AA2BF]">{renameMaterialName.trim().length}/30</span>
            </div>
            <input
              type="text"
              value={renameMaterialName}
              onChange={(event) => {
                const value = event.target.value
                  .replace(/([\\|/?*<>]|\.\.)/g, '')
                  .slice(0, 30);
                setRenameMaterialName(value);
              }}
              placeholder="请输入文件名"
              autoFocus
              className="h-12 w-full rounded-[16px] border border-[#E2EBF5] bg-[#F7FAFE] px-4 text-[14px] text-[#0F2848] outline-none placeholder:text-[#8AA2BF] focus:border-[#4C8BF5] focus:ring-4 focus:ring-[#2563EB1A]"
            />
            {renameMaterialTarget?.fileName?.includes('.') && (
              <p className="mt-2 text-[11px] text-[#8AA2BF]">
                文件后缀将保持为 .{renameMaterialTarget.fileName.split('.').pop()}
              </p>
            )}
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                disabled={isSavingMaterial}
                onClick={() => setRenameMaterialVisible(false)}
                className="h-11 flex-1 rounded-[999px] border border-[#E2EBF5] bg-[#FFFFFF] text-[14px] font-medium text-[#476285] active:bg-[#F7FAFE] disabled:opacity-50"
              >
                取消
              </button>
              <button
                type="button"
                disabled={!renameMaterialName.trim() || isSavingMaterial}
                onClick={handleConfirmRenameMaterial}
                className="h-11 flex-1 rounded-[999px] bg-[#2563EB] text-[14px] font-medium text-white shadow-[0_8px_20px_rgba(37,99,235,0.18)] active:scale-[0.98] disabled:bg-[#E2EBF5] disabled:text-[#8AA2BF] disabled:shadow-none"
              >
                {isSavingMaterial ? '保存中' : '确认'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Template Switch Modal */}
      <QuestionListPicker
        visible={templateModalVisible}
        onClose={() => setTemplateModalVisible(false)}
        onAdd={handleAddQuestionList}
        title={questionPickerMode === 'replace' ? '更换问题清单' : '选择问题清单'}
        confirmText={questionPickerMode === 'replace' ? '确认更换' : '确认选择'}
        singleSelect={questionPickerMode === 'replace'}
      />
    </div>
  );
};

export default DueDiligencePage;
