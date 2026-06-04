import React, { useState, useEffect } from 'react';
import { useThrottleFn } from '../hooks/useThrottleFn';
import { ArrowLeft, Pencil, Camera, Image as ImageIcon, FileText, Mic, Check, FileSpreadsheet, Eye, RefreshCw, MinusCircle, Trash2, Plus, Edit2, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Toast, Dialog, Progress } from 'react-vant';
import Button from '../components/Button';
import VoiceInputModal from '../components/VoiceInputModal';
import { DealRecord, Resource, QuestionInfo } from '../types';
import { dealService } from '../services/dealService';
import { templateService, ReportTemplate } from '../services/templateService';
import { nativeBridge } from '../services/nativeBridge';
import { useRecordingStore } from '../store/useRecordingStore';
import config from '../config';
import AudioPlayerModal from '../components/AudioPlayerModal';
import QuestionListPicker from '../components/QuestionListPicker';


interface MaterialUploadPageProps {
  deal: DealRecord | null;
  onBack: () => void;
  onConfirm?: () => void;
  onStartInterview: () => void;
  onEditInfo?: () => void;
  onChangeTemplate?: () => void;
  onPreviewTemplate?: (name: string, url: string, id: string, type: 'template' | 'file') => void;
  initialTab?: string; // 初始激活的标签页
  onTabChange?: (tab: string) => void; // 标签页切换时的回调
}

const MaterialUploadPage: React.FC<MaterialUploadPageProps> = ({
  deal,
  onBack,
  onConfirm,
  onStartInterview,

  onEditInfo,
  onChangeTemplate,
  onPreviewTemplate,
  initialTab = 'upload',
  onTabChange
}) => {
  const basePath = import.meta.env.BASE_URL || '/';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [voiceModalVisible, setVoiceModalVisible] = useState(false);
  const [voiceModalInitialContent, setVoiceModalInitialContent] = useState('');
  const [currentTemplate, setCurrentTemplate] = useState<ReportTemplate | null>(null);
  const [resources, setResources] = useState<Resource[]>([]);
  const [questions, setQuestions] = useState<QuestionInfo[]>([]);
  const [fileProgressMap, setFileProgressMap] = useState<Record<string, { progress: number; status: string }>>({});

  // 标记各个 tab 的数据是否已加载
  const [loadedTabs, setLoadedTabs] = useState<Set<string>>(new Set());

  // 重命名弹框状态
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [renameTarget, setRenameTarget] = useState<Resource | null>(null);
  const [newFileName, setNewFileName] = useState('');

  // 问题编辑弹框状态
  const [questionEditModalVisible, setQuestionEditModalVisible] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuestionInfo | null>(null);
  const [editedQuestionName, setEditedQuestionName] = useState('');

  // 问题删除确认弹框状态
  const [questionDeleteModalVisible, setQuestionDeleteModalVisible] = useState(false);
  const [deletingQuestion, setDeletingQuestion] = useState<QuestionInfo | null>(null);

  // 新增问题弹框状态
  const [questionAddModalVisible, setQuestionAddModalVisible] = useState(false);
  const [newQuestionName, setNewQuestionName] = useState('');
  const [showLimitTips, setShowLimitTips] = useState(false);

  // 添加清单弹窗状态
  const [templateModalVisible, setTemplateModalVisible] = useState(false);

  // 音频播放弹窗状态
  const [audioModalVisible, setAudioModalVisible] = useState(false);
  const [currentAudioUrl, setCurrentAudioUrl] = useState('');
  const [currentAudioName, setCurrentAudioName] = useState('');
  const { currentDealId } = useRecordingStore();

  // 引用隐藏的 input 元素
  const cameraInputRef = React.useRef<HTMLInputElement>(null);
  const galleryInputRef = React.useRef<HTMLInputElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // 获取尽调详情（包括资源列表）
  const fetchDealDetail = async () => {
    if (!deal?.id) return;

    try {
      console.log('Fetching deal detail for:', deal.id);
      const res = await dealService.getDealInstDetail(deal.id);
      if (res.success && res.data) {
        console.log('Deal detail loaded:', res.data);
        // 合并 resources 和 supplementary
        const resourcesList = res.data.resources || [];
        const supplementaryList = Array.isArray(res.data.supplementary)
          ? (res.data.supplementary as Resource[]).map(item => ({ ...item, type: '4' }))
          : [];

        const merged = [...supplementaryList, ...resourcesList];
        console.log('Merged resources:', merged);
        setResources(merged);
      }
    } catch (error) {
      console.error('Failed to fetch deal detail:', error);
    }
  };

  // 获取模板详情
  const fetchTemplateDetail = async () => {
    if (!deal?.templateId) {
      setCurrentTemplate(null);
      return;
    }

    try {
      const res = await templateService.getTemplateDetail(deal.templateId);
      if (res.success && res.data) {
        setCurrentTemplate(res.data);
      }
    } catch (error) {
      console.error('Failed to fetch template detail:', error);
    }
  };

  // 当 dealId 变化时，重置加载状态
  useEffect(() => {
    setLoadedTabs(new Set());
    setResources([]);
    setQuestions([]);
    // 如果 deal 存在且当前是 upload tab，这将触发下方的 loadTabData 重新加载
  }, [deal?.id]);

  // 当全局 deal 中的问题列表变化时（如在 App.tsx 中更换了模板并同步了问题），同步到本地状态
  useEffect(() => {
    if (deal?.questionInfoList && deal.questionInfoList.length > 0) {
      console.log('[MaterialUploadPage] Syncing questions from deal prop:', deal.questionInfoList.length);
      setQuestions(deal.questionInfoList);
      // 同时标记该 tab 已加载，以便在退出时能够执行保存逻辑
      setLoadedTabs(prev => new Set(prev).add('questions'));
    }
  }, [deal?.questionInfoList]);

  // 当 activeTab 变化时，懒加载对应 tab 的数据
  useEffect(() => {
    const loadTabData = async () => {
      // 如果该 tab 的数据已加载过，跳过
      if (loadedTabs.has(activeTab)) return;

      switch (activeTab) {
        case 'upload':
          await fetchDealDetail();
          break;
        case 'template':
          await fetchTemplateDetail();
          break;
      }

      // 标记该 tab 已加载
      setLoadedTabs(prev => new Set(prev).add(activeTab));
    };

    loadTabData();
  }, [activeTab, deal?.id, deal?.templateId, deal?.questionId]);

  // 当模板的 questionId 变化时，清除问题列表的加载标记
  useEffect(() => {
    if (currentTemplate?.questionId) {
      setLoadedTabs(prev => {
        const newSet = new Set(prev);
        newSet.delete('questions');
        return newSet;
      });
    }
  }, [currentTemplate?.questionId]);

  // 处理文件上传的核心逻辑
  const handleUploadFile = async (file: File) => {
    if (!deal?.id) {
      Toast.fail('未找到尽调实例');
      return;
    }

    try {
      Toast.loading({ message: '上传中...', duration: 0 });
      // 这里的 file 可能是原生 bridge 传回路径后生成的 Mock File，
      // 实际上无法包含真实文件内容。如果需要真实上传，需原生支持。
      // 在此仅演示流程打通。
      const res = await dealService.uploadDealMaterial(deal.id, file);
      Toast.clear();

      if (res.success) {
        Toast.success('上传成功');
        // 刷新资源列表
        await fetchDealDetail();
      } else {
        Toast.fail(res.message || '上传失败');
      }
    } catch (error) {
      Toast.clear();
      console.error('Upload failed:', error);
      Toast.fail('上传失败');
    }
  };

  // 上传状态锁，防止重复触发
  const isUploadingRef = React.useRef(false);

  // 监听原生文件选择回调 (及 Android ImageSelected) - 完整原生上传逻辑
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
          // 刷新资源列表
          await fetchDealDetail();
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
        console.log('[MaterialUploadPage] 收到文件选择回调:', path);
        handleNativeImageUpload(path);
      } else {
        console.warn('[MaterialUploadPage] 文件选择回调数据格式不匹配:', JSON.stringify(res));
      }
    };
    nativeBridge.on('fileSelected', handleFileSelected);



    return () => {

      nativeBridge.off('imageSelected', handleImageSelected);
      nativeBridge.off('fileSelected', handleFileSelected);
    };
  }, [deal?.id]); // 依赖 deal.id 以确保 handleUploadFile 闭包中有最新 ID

  // 监听文件解析进度 WebSocket (参考 web-ai-doc)
  useEffect(() => {
    if (!deal?.id) return;

    // 获取登录 Token
    const token = localStorage.getItem('zov-user-token') || '';

    // 构建 WebSocket URL
    // apiBaseUrl 如: http://domain/report/api
    // wsUrl 应为: ws://domain/report/ws/connect
    let wsUrl = '';
    try {
      const url = new URL(config.apiBaseUrl);
      const protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
      // 假设路径结构为 domain/path/api，将其替换为 domain/path/ws/connect
      const pathBase = url.pathname.replace(/\/api\/?$/, '');
      wsUrl = `${protocol}//${url.host}${pathBase}/ws/connect?dealInstId=${deal.id}&token=${token}`;
    } catch (e) {
      console.error('[WebSocket] Failed to parse apiBaseUrl:', e);
      // 兜底方案
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      wsUrl = `${protocol}//${window.location.host}/ws/connect?dealInstId=${deal.id}&token=${token}`;
    }

    console.log('[WebSocket] Connecting for progress:', wsUrl);

    let ws: WebSocket;
    let pingInterval: any;

    const connect = () => {
      try {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log('[WebSocket] Connected');
          pingInterval = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send('ping');
            }
          }, 15000);
        };

        ws.onmessage = (event) => {
          if (event.data === 'pong') return;
          try {
            const data = JSON.parse(event.data);
            if (data.event === 'DEAL_FILE_PROGRESS' && data.files) {
              setFileProgressMap((prev) => {
                const newMap = { ...prev };
                let changed = false;
                let anySuccess = false;

                data.files.forEach((f: any) => {
                  const statusStr = String(f.status);
                  if (!newMap[f.id] || newMap[f.id].progress !== f.progress || newMap[f.id].status !== statusStr) {
                    newMap[f.id] = {
                      progress: f.progress || 0,
                      status: statusStr,
                    };
                    changed = true;
                    
                    // 如果文件解析成功 (status='3')，触发列表刷新以获取正式 URL
                    if (statusStr === '3' && (!prev[f.id] || prev[f.id].status !== '3')) {
                      anySuccess = true;
                    }
                  }
                });

                if (anySuccess) {
                  // 延迟刷新，确保后端数据已同步
                  setTimeout(() => fetchDealDetail(), 1000);
                }

                return changed ? newMap : prev;
              });
            }
          } catch (e) {
            // 解析失败忽略
          }
        };

        ws.onclose = () => {
          console.log('[WebSocket] Closed');
          clearInterval(pingInterval);
        };

        ws.onerror = (err) => {
          console.error('[WebSocket] Error:', err);
          clearInterval(pingInterval);
        };
      } catch (e) {
        console.error('[WebSocket] Connection failed:', e);
      }
    };

    connect();

    return () => {
      if (pingInterval) clearInterval(pingInterval);
      if (ws) ws.close();
    };
  }, [deal?.id]);



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

    const file = files[0];
    await handleUploadFile(file);

    // 清空 input 以便再次选择同一文件
    e.target.value = '';
  };

  // 删除资料
  const handleDeleteResource = async (resourceId: string) => {
    if (!deal?.id) {
      Toast.fail('未找到尽调实例');
      return;
    }

    Dialog.confirm({
      title: '确认删除',
      message: '确定要删除该资料吗？此操作无法撤销。',
      confirmButtonColor: '#4337F1',
    })
      .then(async () => {
        try {
          Toast.loading({ message: '删除中...', duration: 0 });
          const res = await dealService.deleteDealMaterial(deal.id, resourceId);
          Toast.clear();

          if (res.success) {
            Toast.success('删除成功');
            // 刷新资源列表
            await fetchDealDetail();
          } else {
            Toast.fail(res.message || '删除失败');
          }
        } catch (error) {
          Toast.clear();
          console.error('Delete failed:', error);
          Toast.fail('删除失败');
        }
      })
      .catch(() => {
        // 取消删除
      });
  };

  // 打开重命名弹框
  const handleOpenRenameModal = (resource: Resource) => {
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
        // 刷新资源列表
        await fetchDealDetail();
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
  const getFileIconSrc = (fileName: string): string => {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
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
    // 默认使用 txt 图标
    return `${basePath}assets/txt.png`;
  };



  const handleQuestionAddThrottled = useThrottleFn(() => {
    setNewQuestionName('');
    setQuestionAddModalVisible(true);
  }, 1000);

  const handleUpdateQuestionThrottled = useThrottleFn(async () => {
    if (editedQuestionName.trim() && editingQuestion) {
      const updatedList = questions.map(q =>
        q.id === editingQuestion.id
          ? { ...q, questionName: editedQuestionName.trim() }
          : q
      );
      setQuestions(updatedList);

      if (deal?.id) {
        try {
          Toast.loading({ message: '保存中...', duration: 0 });
          await dealService.createOrUpdateDealInst({
            id: deal.id,
            questionId: deal.questionId,
            questionInfoList: updatedList,
          });
          Toast.clear();
          Toast.success('修改成功');
        } catch (e) {
          Toast.clear();
          console.error('Failed to save question edit:', e);
        }
      }
    }
    setQuestionEditModalVisible(false);
  }, 1000);

  const handleAddQuestionConfirmThrottled = useThrottleFn(async () => {
    if (newQuestionName.trim()) {
      const newQuestion: QuestionInfo = {
        id: String(Date.now()),
        questionName: newQuestionName.trim(),
        questionIndex: questions.length + 1,
        recStatus: '1',
        questionAnswer: null,
        questionAnswerTime: null,
        questionStatus: '0',
        templateId: '',
        agencyId: '',
        CHECKED: false,
      };

      const updatedList = [...questions, newQuestion];
      setQuestions(updatedList);

      if (deal?.id) {
        try {
          Toast.loading({ message: '保存中...', duration: 0 });
          await dealService.createOrUpdateDealInst({
            id: deal.id,
            questionId: deal.questionId,
            questionInfoList: updatedList,
          });
          Toast.clear();
          Toast.success('添加成功');
        } catch (e) {
          Toast.clear();
          console.error('Failed to save new question:', e);
        }
      }
    }
    setQuestionAddModalVisible(false);
  }, 1000);

  const handleAddQuestionLists = async (questionIds: string[]) => {
    if (!deal?.id || questionIds.length === 0) return;
    try {
      Toast.loading({ message: '添加中...', duration: 0 });
      const res = await dealService.addReportQuestionList({
        id: deal.id,
        questionIds,
      });
      Toast.clear();
      if (res.success) {
        Toast.success('清单添加成功');
        setTemplateModalVisible(false);
        const detailRes = await dealService.getDealInstDetail(deal.id);
        if (detailRes.success && detailRes.data && detailRes.data.questionInfoList) {
          setQuestions(detailRes.data.questionInfoList);
        }
      } else {
        Toast.fail(res.message || '添加失败');
      }
    } catch (e) {
      Toast.clear();
      console.error('Add question list failed:', e);
    }
  };

  const handleDeleteQuestionConfirmThrottled = useThrottleFn(async () => {
    if (deletingQuestion) {
      const remainingQuestions = questions.filter(q => q.id !== deletingQuestion.id);
      const reindexedList = remainingQuestions.map((q, index) => ({
        ...q,
        questionIndex: index + 1
      }));
      setQuestions(reindexedList);

      if (deal?.id) {
        try {
          Toast.loading({ message: '保存中...', duration: 0 });
          await dealService.createOrUpdateDealInst({
            id: deal.id,
            questionId: deal.questionId,
            questionInfoList: reindexedList,
          });
          Toast.clear();
          Toast.success('删除成功');
        } catch (e) {
          Toast.clear();
          console.error('Failed to save after delete:', e);
        }
      }
    }
    setQuestionDeleteModalVisible(false);
  }, 1000);

  const uploadOptions = [
    { id: 'camera', label: '相机', icon: Camera },
    { id: 'gallery', label: '相册', icon: ImageIcon },
    { id: 'file', label: '文件', icon: FileText },
    { id: 'voice', label: '语音录入', icon: Mic },
  ];

  // 批量保存问题逻辑
  const saveQuestions = async () => {
    // 只要有 questions 数据且有 deal.id，就允许保存
    if (!deal?.id || questions.length === 0) return;

    try {
      await dealService.createOrUpdateDealInst({
        id: deal.id,
        questionId: deal.questionId,
        questionInfoList: questions
      });
      console.log('[MaterialUploadPage] Questions saved successfully');
    } catch (e) {
      console.error('Auto-save questions failed', e);
    }
  };

  // 辅助函数：离开页面时触发总结生成
  const callGenerateSummary = async () => {
    if (deal?.id) {
      console.log('Leaving MaterialUploadPage: Generating summary for dealId:', deal.id);
      dealService.generateInterviewSummary(deal.id).catch(err => {
        console.error('Failed to generate summary on exit:', err);
      });
    }
  };

  // Throttled Handlers (Defined here to access functions declared above)
  const handleBackThrottled = useThrottleFn(async () => {
    await saveQuestions();
    callGenerateSummary();
    onBack();
  }, 1000);

  // 监听原生返回键
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
  const handleUploadClickThrottled = useThrottleFn(handleUploadClick, 1000);

  const handleStartInterviewThrottled = useThrottleFn(async () => {
    // 校验是否有正在进行的访谈（悬浮窗存在 即 currentDealId 不为空）
    // 如果正在进行的是当前这个 Deal 的访谈，则可以直接进入
    if (currentDealId && currentDealId !== deal?.id) {
      setShowLimitTips(true);
      setTimeout(() => setShowLimitTips(false), 3000);
      return;
    }

    await saveQuestions();
    callGenerateSummary();
    onStartInterview();
  }, 1000);

  const handleConfirmThrottled = useThrottleFn(async () => {
    await saveQuestions();
    callGenerateSummary();
    (onConfirm || onBack)();
  }, 1000);

  const handleDeleteResourceThrottled = useThrottleFn(handleDeleteResource, 1000);
  const handleConfirmRenameThrottled = useThrottleFn(handleConfirmRename, 1000);
  const handleOpenRenameModalThrottled = useThrottleFn(handleOpenRenameModal, 1000);

  const handleGenerateAIPreviewThrottled = useThrottleFn((resource: Resource) => {
    // 优先处理补充资料（语音录入/文本）
    if (resource.type === '4') {
      const fetchSupplementary = async () => {
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
      };
      fetchSupplementary();
      return;
    }

    // 检查是否为音频文件
    const isAudio = ['mp3', 'wav', 'm4a', 'aac', 'flac', 'amr', '3gp', 'ogg'].includes(resource.fileName?.split('.').pop()?.toLowerCase() || '');

    // 普通文件预览
    if (resource.fileUrl) {
      if (isAudio) {
        setCurrentAudioUrl(resource.fileUrl);
        setCurrentAudioName(resource.fileName || '录音');
        setAudioModalVisible(true);
      } else if (onPreviewTemplate) {
        onPreviewTemplate(resource.fileName, resource.fileUrl, resource.id, 'file');
      } else {
        // 降级方案：在新窗口打开
        window.open(resource.fileUrl, '_blank');
      }
    } else {
      Toast.info('暂无预览链接');
    }
  }, 1000);

  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* Custom Limit Tips Toast */}
      {showLimitTips && (
        <div className="fixed top-24 left-4 right-4 z-[100] animate-[slideDown_0.3s_ease-out_forwards] flex justify-center">
          <div className="bg-black/80 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-2">
            <span className="text-sm font-medium tracking-wide">
              您正有一个访谈正在进行中，暂时不支持开启新任务。
            </span>
          </div>
        </div>
      )}
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
      {/* NavBar */}
      <div className="flex items-center justify-between px-4 py-3 sticky top-0 bg-white z-10 relative">
        <button onClick={handleBackThrottled} className="p-2 -ml-2 text-slate-700 hover:bg-slate-50 rounded-full z-20">
          <ArrowLeft size={24} />
        </button>
        
        {/* Centered Title */}
        <div className="absolute left-0 right-0 flex justify-center pointer-events-none">
           <h1 className="text-lg font-bold text-slate-800 max-w-[200px] truncate pointer-events-auto">
             {deal?.interviewCust || ''}
           </h1>
        </div>

        {/* Right Edit Button */}
        <button onClick={handleEditInfoThrottled} className="p-2 -mr-2 text-slate-700 hover:bg-gray-100 rounded-full z-20">
           <Edit2 size={20} className="text-slate-700" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex justify-between px-6 border-b border-gray-100 bg-white z-10">
        {['资料上传', '模板选择', '问题集合'].map((tab, index) => {
          // Mapping internal IDs to display names for logic simplicity
          const tabId = index === 0 ? 'upload' : index === 1 ? 'template' : 'questions';
          const isActive = activeTab === tabId;

          return (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tabId);
                onTabChange?.(tabId);
              }}
              className={`pb-3 pt-2 text-[15px] font-medium relative transition-colors ${isActive ? 'text-slate-900 font-bold' : 'text-gray-400'
                }`}
            >
              {tab}
              {isActive && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-[3px] bg-indigo-600 rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* Main Content */}
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto bg-[#F7F8FA] pb-16">

        {/* Tab 1: Upload */}
        {activeTab === 'upload' && (
          <div className="space-y-4">
            {/* Upload Grid */}
            <div className="sticky top-0 z-30 px-4 pt-4 pb-2 bg-[#F7F8FA]">
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="grid grid-cols-4 gap-2">
                  {uploadOptions.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => handleUploadClickThrottled(opt.id)}
                      className="flex flex-col items-center justify-center py-4 rounded-xl active:bg-gray-50 transition-colors"
                    >
                      <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center mb-2 text-slate-700">
                        <opt.icon size={24} strokeWidth={1.5} />
                      </div>
                      <span className="text-xs text-gray-500 font-medium">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>


            {/* AI Analysis Card - Temporarily Hidden */}
            {/* <div
              className="mx-4 rounded-2xl p-4 flex items-center justify-between relative overflow-hidden shadow-sm bg-gradient-to-r from-indigo-50 to-violet-50">
              <div className="flex items-center gap-4 relative z-10">
                <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-sm text-indigo-500">
                  <Sparkles size={28} fill="currentColor" className="opacity-90" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">AI资料分析</h3>
                  <p className="text-xs text-slate-500 mt-1">自动提炼关键信息</p>
                </div>
              </div>
              <button
                className="px-4 py-1.5 bg-white text-indigo-600 text-xs font-bold rounded-full shadow-sm active:scale-95 transition-transform z-10"
                onClick={onGenerateAI}
              >
                去生成
              </button>
            </div> */}

            {/* Uploaded Files List */}
            {/* Uploaded Files List */}
            {resources.length > 0 ? (
              <div className="mx-4 bg-white rounded-2xl shadow-sm pb-4">
                <div className="sticky top-[154px] z-20 bg-white px-4 py-4 rounded-t-2xl border-b border-gray-100">
                  <h3 className="text-sm font-bold text-slate-800">已上传资料 ({resources.length})</h3>
                </div>
                <div className="px-4 divide-y divide-gray-100">
                  {resources.map((resource) => {
                    const iconSrc = getFileIconSrc(resource.fileName);
                    return (
                      <div
                        key={resource.id}
                        className="flex items-center py-3 gap-3 group border-b border-transparent last:border-b-0 transition-colors rounded-lg px-2 -mx-2 mb-1"
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
                          onClick={() => handleGenerateAIPreviewThrottled(resource)}
                          onMouseDown={(e) => e.preventDefault()}
                          tabIndex={-1}
                          className="flex-1 flex flex-col min-w-0 justify-center text-left transition-colors active:scale-[0.98] outline-none"
                        >
                          <span className="text-[14px] text-slate-800 truncate w-full leading-tight">{resource.fileName}</span>
                          {resource.fileTags && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {(Array.isArray(resource.fileTags) ? resource.fileTags : String(resource.fileTags).split(',')).map((tag: string, i: number) => tag.trim() && (
                                <span key={i} className="px-1.5 py-[2px] rounded-[4px] bg-[#EAE8FF] text-[#4B42F5] text-[10px] font-medium truncate max-w-full leading-tight">
                                  {tag.trim()}
                                </span>
                              ))}
                            </div>
                          )}
                        </button>


                        {/* Delete Button */}
                        <div className="flex items-center gap-1">
                          {/* Progress Indicator */}
                          {(() => {
                            const progressInfo = fileProgressMap[resource.id];
                            if (!progressInfo || progressInfo.status === '1') return null;

                            if (progressInfo.status === '3') {
                              return <CheckCircle2 size={18} className="text-green-500 flex-shrink-0" />;
                            }
                            if (progressInfo.status === '4') {
                              return (
                                <div className="flex items-center gap-1">
                                  <AlertCircle size={18} className="text-red-500 flex-shrink-0" />
                                  <button 
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      if (!deal?.id) return;
                                      try {
                                        Toast.loading({ message: '重新解析中...', duration: 0, forbidClick: true });
                                        const res = await dealService.reparseFile(deal.id, resource.id);
                                        if (res.success) {
                                          Toast.success('重新解析已触发');
                                          fetchDealDetail();
                                        } else {
                                          Toast.fail(res.message || '触发失败');
                                        }
                                      } catch (error) {
                                        console.error('Reparse failed:', error);
                                        Toast.fail('操作失败，请重试');
                                      }
                                    }}
                                    className="text-[10px] text-indigo-600 underline font-medium"
                                  >
                                    重新解析
                                  </button>
                                </div>
                              );
                            }
                            
                            // Parsing
                            return (
                              <div className="flex items-center gap-2">
                                <div className="w-8">
                                   <Progress 
                                     percentage={Math.round(progressInfo.progress * 100)} 
                                     strokeWidth={3}
                                     showPivot={false}
                                     color="linear-gradient(to right, #4f46e5, #818cf8)"
                                   />
                                </div>
                                <Loader2 size={12} className="text-indigo-500 animate-spin" />
                              </div>
                            );
                          })()}

                          {resource.type !== '4' && (
                            <button
                              onClick={() => handleOpenRenameModalThrottled(resource)}
                              className="p-1.5 text-indigo-400 hover:text-indigo-600 transition-colors"
                            >
                              <Pencil size={16} strokeWidth={2} />
                            </button>
                          )}

                          <button
                            onClick={() => handleDeleteResourceThrottled(resource.id)}
                            className="p-1.5 text-indigo-400 hover:text-indigo-600 transition-colors"
                          >
                            <MinusCircle size={20} strokeWidth={2} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center pt-16 pb-8">
                <img
                  src={`${basePath}assets/kno.png`}
                  alt="暂无资料"
                  className="w-[200px] h-auto mb-4 opacity-90"
                />
                <p className="text-sm text-slate-500 font-medium">快上传你的资料，体验自动分析</p>
              </div>
            )}
            {/* 底部占位，防止遮挡最后一条 */}
            <div style={{ height: 120, flexShrink: 0 }} />
          </div>
        )}

        {/* Tab 2: Templates */}
        {activeTab === 'template' && (
          <div className="space-y-3 p-4">
            {currentTemplate ? (
              <div key={currentTemplate.id} className="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-4">
                {/* Card Header */}
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#E8F8F0] flex items-center justify-center flex-shrink-0 text-[#07C160]">
                    <FileSpreadsheet size={24} strokeWidth={1.5} />
                  </div>
                  <h3 className="text-[15px] font-bold text-slate-800 leading-snug pt-1">
                    {currentTemplate.reportTemplateName}
                  </h3>
                </div>

                {/* Card Footer */}
                <div className="flex items-center justify-between pt-1">
                  <div className="px-2 py-1 rounded-md text-[10px] font-medium bg-gray-100 text-gray-500">
                    默认使用
                  </div>

                  <div className="flex gap-3">
                    <Button
                      variant="secondary"
                      size="small"
                      className="!h-8 !px-4 !border-gray-200 !text-gray-600 !rounded-full !font-normal"
                      onClick={() => {
                        if (onPreviewTemplate && currentTemplate) {
                          onPreviewTemplate(currentTemplate.reportTemplateName, currentTemplate.viewTemplateUrl, currentTemplate.id, 'template');
                        }
                      }}
                    >
                      <Eye size={14} className="mr-1.5" /> 预览
                    </Button>
                    <Button
                      variant="primary"
                      size="small"
                      className="!h-8 !px-4 !rounded-full !shadow-indigo-200 !font-normal bg-indigo-600"
                      onClick={onChangeTemplate}
                    >
                      <RefreshCw size={14} className="mr-1.5" /> 更换
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-gray-400 text-sm">
                暂无模板信息
              </div>
            )}
            {/* 底部占位，防止遮挡最后一条 */}
            <div style={{ height: 120, flexShrink: 0 }} />
          </div>
        )}

        {/* Tab 3: Questions */}
        {activeTab === 'questions' && (
          <div className="flex flex-col h-full p-4 pb-2 overflow-hidden relative">
            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setTemplateModalVisible(true)}
                className="flex-1 h-12 rounded-xl bg-white border border-indigo-100 text-indigo-600 font-bold text-[14px] flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all shadow-sm"
              >
                <Plus size={18} strokeWidth={2.5} />
                添加清单
              </button>
              <button
                onClick={() => handleQuestionAddThrottled()}
                className="flex-1 h-12 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold text-[14px] flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all shadow-sm"
              >
                <Plus size={18} strokeWidth={2.5} />
                手动添加
              </button>
            </div>

            {/* Questions List */}
            {questions.length > 0 ? (
              <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-sm overflow-hidden mt-3">
                {/* Fixed Header */}
                <div className="p-4 border-b border-gray-100 flex-shrink-0">
                  <h3 className="text-sm font-bold text-slate-800">问题列表 ({questions.length})</h3>
                </div>

                {/* Scrollable Questions Content */}
                <div className="flex-1 overflow-y-auto">
                  <div className="divide-y divide-gray-100">
                    {questions.map((question) => (
                      <div
                        key={question.id}
                        className="flex items-center py-3 px-4 gap-2"
                      >
                        {/* Question Index */}
                        <span className="text-sm font-medium text-indigo-600 flex-shrink-0 w-6">
                          {question.questionIndex}.
                        </span>

                        {/* Question Name */}
                        <span className="flex-1 text-sm text-slate-800">
                          {question.questionName}
                        </span>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {/* 编辑按钮 */}
                          <button
                            onClick={() => {
                              setEditingQuestion(question);
                              setEditedQuestionName(question.questionName);
                              setQuestionEditModalVisible(true);
                            }}
                            className="p-2 text-gray-300 hover:text-indigo-500 transition-colors"
                          >
                            <Pencil size={14} />
                          </button>
                          {/* 删除按钮 */}
                          <button
                            onClick={() => {
                              setDeletingQuestion(question);
                              setQuestionDeleteModalVisible(true);
                            }}
                            className="p-2 text-gray-300 hover:text-indigo-500 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* 底部占位，防止遮挡最后一条 */}
                  <div style={{ height: 120, flexShrink: 0 }} />
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-400 mt-3">
                <FileText size={48} className="mb-4 opacity-20" />
                <p className="text-sm">暂无问题</p>
              </div>
            )}

          </div>
        )}

      </div>

      {/* Fixed Bottom Bar */}
      {/* Fixed Bottom Bar - Matching DueDiligencePage style */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto px-4 pb-3 z-30 flex gap-4">
        <Button
          variant="secondary"
          block
          className="flex-1 !rounded-full !bg-white !border-indigo-100 !text-indigo-600 !h-12 !text-[16px] shadow-lg shadow-indigo-100/50"
          onClick={handleConfirmThrottled}
        >
          <Check size={18} className="mr-2" /> 确定
        </Button>

        <Button
          variant="primary"
          block
          className="flex-1 !rounded-full !h-12 !text-[16px] shadow-lg shadow-indigo-500/30"
          onClick={handleStartInterviewThrottled}
        >
          <Mic size={18} className="mr-2" /> 开启访谈
        </Button>
      </div>

      {/* Voice Input Modal */}
      <VoiceInputModal
        visible={voiceModalVisible}
        dealId={deal?.id}
        initialContent={voiceModalInitialContent}
        onClose={() => {
          setVoiceModalVisible(false);
          setVoiceModalInitialContent('');
        }}
        onSave={async (content) => {
          console.log('Material upload voice input content saved:', content);
          Toast.success('录入成功');
          // 刷新资源列表
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
                onClick={handleConfirmRenameThrottled}
                className="flex-1 py-3 text-base font-medium text-white rounded-full transition-colors shadow-lg shadow-indigo-200 active:scale-95 transition-transform bg-confirm-gradient"
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Question Edit Modal */}
      {questionEditModalVisible && editingQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setQuestionEditModalVisible(false)}
          />
          <div className="relative bg-white rounded-2xl w-[85%] max-w-[340px] shadow-xl animate-fadeIn">
            <div className="pt-5 pb-3 text-center">
              <h3 className="text-lg font-semibold text-slate-800">编辑问题</h3>
            </div>
            <div className="px-5 pb-5">
              <textarea
                value={editedQuestionName}
                onChange={(e) => setEditedQuestionName(e.target.value)}
                className="w-full min-h-[120px] p-4 text-base text-slate-700 bg-gray-50 rounded-xl border border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none resize-none transition-all"
                placeholder="请输入问题内容"
              />
            </div>
            <div className="flex border-t border-gray-100">
              <button
                onClick={() => setQuestionEditModalVisible(false)}
                className="flex-1 py-4 text-center text-slate-600 font-medium hover:bg-gray-50 rounded-bl-2xl transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleUpdateQuestionThrottled}
                className="flex-1 py-4 text-center text-white font-medium rounded-br-2xl transition-colors bg-primary-gradient"
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Question Delete Confirm Modal */}
      {questionDeleteModalVisible && deletingQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setQuestionDeleteModalVisible(false)}
          />
          <div className="relative bg-white rounded-2xl w-[85%] max-w-[320px] shadow-xl animate-fadeIn overflow-hidden">
            <div className="pt-6 pb-4 px-6 text-center">
              <div className="w-14 h-14 mx-auto mb-4 bg-indigo-50 rounded-full flex items-center justify-center">
                <Trash2 size={24} className="text-indigo-500" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800 mb-2">删除问题</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                确定要删除该问题吗？删除后无法恢复。
              </p>
            </div>
            <div className="flex border-t border-gray-100">
              <button
                onClick={() => setQuestionDeleteModalVisible(false)}
                className="flex-1 py-4 text-center text-slate-600 font-medium hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleDeleteQuestionConfirmThrottled}
                className="flex-1 py-4 text-center text-white font-medium bg-indigo-600 hover:bg-indigo-700 transition-colors"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Question Add Modal */}
      {questionAddModalVisible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setQuestionAddModalVisible(false)}
          />
          <div className="relative bg-white rounded-2xl w-[85%] max-w-[340px] shadow-xl animate-fadeIn">
            <div className="pt-5 pb-3 text-center">
              <h3 className="text-lg font-semibold text-slate-800">新增问题</h3>
            </div>
            <div className="px-5 pb-5">
              <textarea
                value={newQuestionName}
                onChange={(e) => setNewQuestionName(e.target.value)}
                className="w-full min-h-[120px] p-4 text-base text-slate-700 bg-gray-50 rounded-xl border border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none resize-none transition-all"
                placeholder="请输入问题内容"
              />
            </div>
            <div className="flex border-t border-gray-100">
              <button
                onClick={() => setQuestionAddModalVisible(false)}
                className="flex-1 py-4 text-center text-slate-600 font-medium hover:bg-gray-50 rounded-bl-2xl transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleAddQuestionConfirmThrottled}
                className="flex-1 py-4 text-center text-white font-medium rounded-br-2xl transition-colors bg-primary-gradient"
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Question List Picker Modal */}
      <QuestionListPicker
        visible={templateModalVisible}
        onClose={() => setTemplateModalVisible(false)}
        dealId={deal?.id || ''}
        onAdd={handleAddQuestionLists}
      />

      {/* Audio Player Modal */}
      <AudioPlayerModal
        visible={audioModalVisible}
        onClose={() => setAudioModalVisible(false)}
        audioUrl={currentAudioUrl}
        fileName={currentAudioName}
      />
    </div>
  );
};

export default MaterialUploadPage;