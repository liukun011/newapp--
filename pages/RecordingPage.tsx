import React, { useState, useEffect } from 'react';
import { useThrottleFn } from '../hooks/useThrottleFn';
import { 
  ArrowLeft, 
  Pause, 
  Square, 
  Mic, 
  History as HistoryIcon,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  User,
  Clock
} from 'lucide-react';
import { Dialog, Toast } from 'react-vant';
import SoundWave from '../components/SoundWave';
import Button from '../components/Button';
import { Question, DealRecord } from '../types';
import { dealService } from '../services/dealService';
import fixIcon from '../assets/fix.svg';

import { useRecordingStore } from '../store/useRecordingStore';
import { nativeBridge } from '../services/nativeBridge';
import config from '../config';






interface RecordingPageProps {
  deal: DealRecord | null;
  onBack: () => void;
  onHistoryClick?: () => void;
  isRecording: boolean;
  seconds: number;
  onToggleRecording: (forceState?: boolean) => void;
  interviewInstId?: string;
  interviewInstTitle?: string;
  onFinish?: () => void;
  onDealUpdate?: (deal: DealRecord) => void;
}



const RecordingPage: React.FC<RecordingPageProps> = ({
  deal,
  onBack,
  onHistoryClick,
  isRecording,
  seconds,
  onToggleRecording,
  interviewInstId,
  interviewInstTitle,
  onFinish,
  onDealUpdate
}) => {
  const [activeTab, setActiveTab] = useState<'questions' | 'transcription'>('questions');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [expandedQuestion, setExpandedQuestion] = useState<number | string | null>(null);
  const [isTranscriptionCollapsed, setIsTranscriptionCollapsed] = useState(false);
  const { transcriptionList, setTranscriptionList } = useRecordingStore();
  console.log('[RecordingPage] transcriptionList', transcriptionList);

  const resetStore = useRecordingStore(state => state.reset);

  // Scroll container ref
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const headerRef = React.useRef<HTMLDivElement>(null);
  const [showTimeTitle, setShowTimeTitle] = useState(false);

  const handleScroll = () => {
    if (scrollContainerRef.current && headerRef.current) {
      if (scrollContainerRef.current.scrollTop > headerRef.current.offsetHeight - 20) {
        setShowTimeTitle(true);
      } else {
        setShowTimeTitle(false);
      }
    }
  };

  // 刷新 Deal 详情
  const refreshDealInfo = async () => {
    if (!deal?.id) return;
    try {
      const res = await dealService.getDealInstDetail(deal.id);
      if (res.success && res.data && onDealUpdate) {
        //  console.log('[RecordingPage] 刷新 Deal 详情成功');
        onDealUpdate(res.data);
      }
    } catch (error) {
      console.error('[RecordingPage] 刷新 Deal 详情失败', error);
    }
  };

  // Scroll to bottom when list updates or tab becomes active
  useEffect(() => {
    if (activeTab === 'transcription' && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      // Use setTimeout to ensure DOM has updated
      setTimeout(() => {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: 'smooth'
        });
      }, 100);
    } else if (activeTab === 'questions') {
      // console.log('[deal] 切换到问题列表，刷新数据');
      refreshDealInfo();
    }
  }, [transcriptionList, activeTab]);

  // 初始化时也刷新一次
  useEffect(() => {
    refreshDealInfo();
  }, [deal?.id]);

  // 监听原生返回键
  useEffect(() => {
    const handleNativeBack = (e: Event) => {
      e.preventDefault();
      onBack();
    };

    window.addEventListener('requestNativeBack', handleNativeBack);
    return () => {
      window.removeEventListener('requestNativeBack', handleNativeBack);
    };
  }, [onBack]);

  // Update Store with current Deal ID when entering page
  const setData = useRecordingStore(state => state.setData);

  // useEffect removed to prevent auto-setting ID on view


  // 同步问题清单数据
  useEffect(() => {
    if (deal?.questionInfoList && deal.questionInfoList.length > 0) {
      const backendQuestions: Question[] = deal.questionInfoList.map((item, index) => ({
        id: item.id || String(index),
        text: item.questionName,
        isAnswered: !!item.CHECKED,
        details: item.questionAnswer || undefined,
        answerTime: item.questionAnswerTime || undefined
      }));
      setQuestions(backendQuestions);
    }
  }, [deal]);


  // ========== 离线转写：轮询转写结果 ==========
  const [lastFetchedCount, setLastFetchedCount] = React.useState(0);
  const pollingIntervalRef = React.useRef<NodeJS.Timeout | null>(null);

  // 初次获取历史转写记录
  useEffect(() => {
    // 只有在以下情况才调用接口获取历史转写记录：
    // 1. 有 interviewInstId
    // 2. 列表为空（首次进入）
    // 3. 不在录音中（正在录音时通过轮询获取）
    if (interviewInstId && transcriptionList.length === 0 && !isRecording) {
      const fetchTranscription = async () => {
        try {
          const res = await dealService.queryInterviewInstContentListByPage({
            interviewInstId,
            cacheCount: 0  // 初次获取，缓存为0
          });
          if (res.success && res.data && res.data.records) {
            // 兼容性处理：如果后端没返回 type，则默认不过滤；如果没返回 roleId，直接使用 id
            const validRecords = res.data.records
              .filter((item: any) => !item.type || item.type !== '4')
              .map((item: any) => ({
                ...item,
                // 如果没有 roleId，直接使用 id
                roleId: item.roleId || item.id,
                isFinal: true
              }));
            setTranscriptionList(validRecords);
            setLastFetchedCount(validRecords.length);
          }
        } catch (error) {
          console.error('获取转写记录失败', error);
        }
      };
      fetchTranscription();
    }
  }, [interviewInstId, transcriptionList.length, isRecording, setTranscriptionList]);

  // 使用 Ref 追踪最新的 isRecording 状态，用于在异步操作中判断（重命名以避免冲突）
  const isRecordingForPollingRef = React.useRef(isRecording);
  useEffect(() => {
    isRecordingForPollingRef.current = isRecording;
  }, [isRecording]);

  // 使用 Ref 追踪最新的数据，避免 useEffect 依赖变化导致死循环
  const transcriptionListRef = React.useRef(transcriptionList);
  const lastFetchedCountRef = React.useRef(lastFetchedCount);

  // 同步 Ref
  useEffect(() => {
    transcriptionListRef.current = transcriptionList;
  }, [transcriptionList]);

  useEffect(() => {
    lastFetchedCountRef.current = lastFetchedCount;
  }, [lastFetchedCount]);

  // 录音时轮询获取转写结果
  useEffect(() => {
    if (!isRecording || !interviewInstId) {
      // 停止轮询
      if (pollingIntervalRef.current) {
        console.log('[轮询] 停止轮询 (录音暂停或结束)');
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      return;
    }

    console.log('[轮询] 开始轮询转写结果...');



    const pollTranscription = async () => {
      // 双重检查：如果已经暂停，不再发起请求
      if (!isRecordingForPollingRef.current) return;

      try {
        // 使用 Ref 获取最新长度，避免闭包陷阱
        const currentCacheCount = transcriptionListRef.current.length; 
        
        const res = await dealService.queryInterviewInstContentListByPage({
          interviewInstId,
          cacheCount: currentCacheCount
        });

        if (!isRecordingForPollingRef.current) return;

        if (res.success && res.data && res.data.records) {
          const newRecords = res.data.records
            .filter((item: any) => !item.type || item.type !== '4')
            .map((item: any) => ({
              ...item,
              // 如果没有 roleId，直接使用 id
              roleId: item.roleId || item.id,
              isFinal: true
            }));
          
          if (newRecords.length > 0) {
            console.log(`[轮询] 收到增量数据：${newRecords.length} 条, cacheCount: ${currentCacheCount}`);
            
            const currentList = transcriptionListRef.current;
            let baseList = currentList;

            // 核心逻辑：
            // cacheCount !== 0 时，后端返回的第一条是对列表最后一条的更新/替换
            // 因此需要先删掉本地的最后一条，再合并新数据
            if (currentCacheCount !== 0 && currentList.length > 0) {
              baseList = currentList.slice(0, -1);
            }

            const mergedList = [...baseList, ...newRecords];
            
            setTranscriptionList(mergedList);
            setLastFetchedCount(mergedList.length);
          }
        }
      } catch (error) {
        console.error('[轮询] 获取转写记录失败:', error);
      }
    };

    // 立即执行一次
    pollTranscription();
    // 用户原设定是 15000，虽然有点慢，但我先保持不变，除非用户要求
    pollingIntervalRef.current = setInterval(pollTranscription, 5000);

    // 清理
    return () => {
      if (pollingIntervalRef.current) {
        console.log('[轮询] 清理定时器');
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [isRecording, interviewInstId]);

  const formatTime = (totalSeconds: number) => {
    if (!Number.isFinite(totalSeconds)) return '00:00:00';
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // ========== 注释：Native已自动处理上传，前端无需调用 ==========
  // 上传转写内容到服务器
  // const uploadTranscriptionContent = async () => {
  //   if (!interviewInstId) {
  //     return;
  //   }
  //
  //   // 只上传最终结果（isFinal: true）
  //   const finalResults = transcriptionList.filter(item => item.isFinal);
  //
  //   if (finalResults.length === 0) {
  //     console.log('[上传转写] 没有需要上传的内容');
  //     return;
  //   }
  //
  //   try {
  //     const contentList = finalResults.map(item => ({
  //       id: item.roleId,
  //       content: item.content,
  //     }));
  //
  //     // DEBUG: Upload Content List
  //     console.log('[上传转写] Content List:', JSON.stringify(contentList, null, 2));
  //
  //     console.log('[上传转写] 上传内容:', contentList.length, '条');
  //
  //     await dealService.uploadInterviewInstContent({
  //       interviewInstId,
  //       contentList,
  //     });
  //
  //     console.log('[上传转写] 上传成功');
  //   } catch (error) {
  //     console.error('[上传转写] 上传失败:', error);
  //   }
  // };




  // ========== 注释：Native已自动处理上传，前端无需调用 ==========
  // 上传锁
  // const isUploadingRef = React.useRef(false);
  //
  // // 获取并上传录音文件（Native已自动处理，以下代码已注释）
  // const uploadRecordingFile = async (): Promise<boolean> => {
  //   if (!interviewInstId) {
  //     console.log('[上传录音] 没有 interviewInstId');
  //     return false;
  //   }
  //
  //   if (isUploadingRef.current) {
  //     console.log('[上传录音] 已经在上传中，跳过本次调用');
  //     return true;
  //   }
  //   isUploadingRef.current = true;
  //
  //   // 从 Native 获取录音文件（所有环境统一使用）
  //   try {
  //     return await new Promise((resolve) => {
  //       // 设置回调监听
  //       const handleAudioList = async (response: any) => {
  //         nativeBridge.off('getAudioList', handleAudioList); // 移除监听
  //
  //         console.log("--- AUDIO LIST RESP ---", JSON.stringify(response, null, 2));
  //
  //         if (response.success && response.data && response.data.list && response.data.list.length > 0) {
  //           const latestAudio = response.data.list[0];
  //           try {
  //             const rawFileUrl = latestAudio.fileURL || "";
  //             const fileUrl = rawFileUrl.trim();
  //
  //             console.log('[上传录音] 调用 Native 上传接口, filePath:', fileUrl);
  //             console.log(`Native Uploading: ${fileUrl}...`);
  //
  //             const token = localStorage.getItem('zov-user-token') || '';
  //             const uploadHost = config.uploadUrl;
  //
  //             const params = {
  //               host: uploadHost,
  //               authorization: token,
  //               filePath: fileUrl,
  //             }
  //             console.log('[上传录音] Upload Params:', JSON.stringify(params, null, 2));
  //
  //             const uploadPromise = new Promise<boolean>((resolveUpload, rejectUpload) => {
  //               const handleUploadResult = (res: any) => {
  //                 console.log('[上传录音] Upload Result:', JSON.stringify(res, null, 2));
  //
  //                 if (res.success === false) {
  //                   nativeBridge.off('onUploadResult', handleUploadResult);
  //                   rejectUpload(new Error(res.message || 'Native Bridge Call Failed'));
  //                   return;
  //                 }
  //
  //                 if (!res.data) return;
  //
  //                 const resultData = res.data.result || (res.data.success !== undefined ? res.data : null);
  //
  //                 if (resultData) {
  //                   console.log('[上传录音] Parsed Result Data:', JSON.stringify(resultData));
  //
  //                   const isSuccess = resultData.success === true || resultData.errno === 0;
  //
  //                   if (isSuccess) {
  //                     nativeBridge.off('onUploadResult', handleUploadResult);
  //
  //                     const fileUrl = resultData.data?.url || resultData.url || (typeof resultData.data === 'string' ? resultData.data : "");
  //                     console.log('[上传录音] Native上传成功，URL:', fileUrl);
  //
  //                     if (fileUrl) {
  //                       console.log('[上传录音] 调用saveInterviewInstRecordFile请求参数:', {
  //                         path: fileUrl,
  //                         interviewInstId: interviewInstId
  //                       });
  //                       dealService.saveInterviewInstRecordFile({
  //                         path: fileUrl,
  //                         interviewInstId: interviewInstId
  //                       }).then(saveRes => {
  //                         if (saveRes.success) {
  //                           console.log('[上传录音] 绑定记录成功');
  //                           Toast.clear();
  //                           resolveUpload(true);
  //                         } else {
  //                           console.error('[上传录音] 绑定记录失败:', saveRes.message);
  //                           Toast.clear();
  //                           rejectUpload(new Error(saveRes.message || '绑定录音失败'));
  //                         }
  //                       }).catch(err => {
  //                         console.error('[上传录音] 绑定接口异常:', err);
  //                         Toast.clear();
  //                         rejectUpload(new Error('绑定录音接口异常'));
  //                       });
  //                     } else {
  //                       console.warn('[上传录音] 未获取到文件 URL, resultData:', JSON.stringify(resultData));
  //                       resolveUpload(true);
  //                     }
  //                   } else {
  //                     console.warn('[上传录音] Native返回成功但业务失败:', resultData.message);
  //                     if (resultData.success === false || (resultData.errno !== undefined && resultData.errno !== 0)) {
  //                       nativeBridge.off('onUploadResult', handleUploadResult);
  //                       rejectUpload(new Error(resultData.message || 'Upload Failed'));
  //                     }
  //                   }
  //                 }
  //               };
  //
  //               nativeBridge.on('onUploadResult', handleUploadResult);
  //               nativeBridge.uploadInterviewFile(params);
  //
  //               setTimeout(() => {
  //                 nativeBridge.off('onUploadResult', handleUploadResult);
  //                 rejectUpload(new Error('Upload Timeout (60s)'));
  //               }, 60000);
  //             });
  //
  //             await uploadPromise;
  //             console.log('[上传录音] 上传流程结束');
  //             resolve(true);
  //
  //           } catch (error: any) {
  //             resolve(false);
  //           }
  //         } else {
  //           console.log('[上传录音] 没有找到录音文件');
  //           resolve(false);
  //         }
  //       };
  //
  //       nativeBridge.on('getAudioList', handleAudioList);
  //       console.log('[上传录音] 查询录音文件, surveyId:', interviewInstId);
  //       nativeBridge.getAudioList({
  //         surveyId: interviewInstId,
  //         page: 0,
  //         pageSize: 999,
  //       });
  //     });
  //   } finally {
  //     isUploadingRef.current = false;
  //   }
  // };

  const handleFinishInterview = () => {
    Dialog.confirm({
      title: '结束访谈',
      message: '确定要结束当前的访谈吗？结束将停止录音并保存记录。',
      confirmButtonText: '确定结束',
      cancelButtonText: '继续访谈',
      confirmButtonColor: '#4337F1',
    })
      .then(async () => {
        if (!interviewInstId) {
          // 如果没有 ID，直接重置并返回
          resetStore();
          if (onFinish) {
            onFinish();
          } else {
            onBack();
          }
          return;
        }

        Toast.loading({ message: '正在保存...', forbidClick: true, duration: 0 });
        try {
          // 只有在录音中才执行：停止录音
          if (isRecording) {
            nativeBridge.stopRecording();
            // 注释：Native会自动上传，前端无需调用
            // try {
            //   await Promise.all([
            //     uploadRecordingFile(),
            //     uploadTranscriptionContent()
            //   ]);
            // } catch (e) {
            //   console.error('上传过程异常:', e);
            // }
          }
          // 3. 结束访谈
          const res = await dealService.overInterviewInst(interviewInstId);
          if (res.success) {
            resetStore(); // 清除全局状态（浮窗消失）
            Toast.success('访谈已结束');
            if (onFinish) {
              onFinish();
            } else {
              onBack();
            }
          } else {
            Toast.fail(res.message || '结束失败');
          }
        } catch (error) {
          console.error(error);
          Toast.fail('网络异常，结束失败');
        } finally {
          Toast.clear();
        }
      })
      .catch(() => {
        // 取消结束
      });
  };



  const [countdown, setCountdown] = useState<number>(0);

  const handleToggleWrapper = async () => {
    if (isRecording) {
      // 停止录音（暂停）
      console.log("[H5] calling stopRecord...");
      nativeBridge.stopRecording();

      onToggleRecording();

      // 注释：Native会自动上传，前端无需调用
      // await uploadTranscriptionContent();

      // 刷新 Deal 详情，确保获取最新状态
      refreshDealInfo();

      // 延迟刷新：后端生成答案可能需要时间，非阻塞式轮询更新
      setTimeout(() => refreshDealInfo(), 2500);
      setTimeout(() => refreshDealInfo(), 5000);
      setTimeout(() => refreshDealInfo(), 10000);
      setTimeout(() => refreshDealInfo(), 15000);


    } else {
      if (seconds === 0) {
        setCountdown(3); // Changed to 3s for better UX
      } else {
        // 继续录音
        startNativeRecord();
      }
    }
  };

  const handleToggleWrapperThrottled = useThrottleFn(handleToggleWrapper, 1000);
  const handleFinishInterviewThrottled = useThrottleFn(handleFinishInterview, 1000);

  // 追踪 isRecording 最新状态，用于异步回调中判断
  const isRecordingRef = React.useRef(isRecording);
  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  // 追踪最新的 onToggleRecording 函数，防止闭包陷阱
  const onToggleRecordingRef = React.useRef(onToggleRecording);
  useEffect(() => {
    onToggleRecordingRef.current = onToggleRecording;
  }, [onToggleRecording]);

  const startNativeRecord = async () => {
    let currentInstId = interviewInstId;

    // 如果 currentInstId 为空（例如中断后 Reset 了），需要重新创建
    if (!currentInstId && deal?.id) {
      try {
        Toast.loading({ message: '准备录音环境...', forbidClick: true, duration: 0 });
        const createRes = await dealService.createInterviewInst({
          interviewDealInstId: deal.id,
          interviewCustom: deal.interviewCust || '未命名客户'
        });
        Toast.clear();

        if (createRes.success && createRes.data) {
          // 兼容处理：data可能是直接的ID，也或者是包含id的对象
          const rawData = createRes.data;
          const newId = (typeof rawData === 'object' && rawData.interviewInstId) ? rawData.interviewInstId : rawData;
          currentInstId = String(newId);

          const instTitle = deal.interviewCust ? `${deal.interviewCust}的访谈` : '新访谈';
          console.log(`[H5] Re-created interview instance: ${currentInstId}`);

          // 更新 Store (不设置 dealId，等真正开始录音时再设置)
          setData({
            interviewInstId: currentInstId,
            title: instTitle
          });
        } else {
          Toast.fail('创建访谈失败，无法开始录音');
          return;
        }
      } catch (e) {
        console.error(e);
        Toast.clear();
        Toast.fail('网络错误，无法开始录音');
        return;
      }
    }

    const surveyId = currentInstId || '';
    console.log(`[H5] Calling startRecord with surveyId: ${surveyId}`);

    // Update global store - set dealId when recording actually starts
    if (deal?.id) {
      setData({ dealId: deal.id });
    }

    // 设置Native自动上传参数（只需调用一次）
    const token = localStorage.getItem('zov-user-token') || '';
    const uploadUrl = config.apiBaseUrl + '/interview/uploadInterviewInstRecordFileNew';
    
    nativeBridge.setHumanVoiceAudioFileUploadParameters({
      host: uploadUrl,
      token: `Bearer ${token}`,
      interviewInstId: surveyId
    });
    console.log('[H5] 设置Native上传参数:', { host: uploadUrl, interviewInstId: surveyId });

    nativeBridge.startRecordingWithParams({ surveyId, roleType: 2, isRealTime: 2 });
    onToggleRecording();

    // 更新访谈状态为进行中(2)
    dealService.updateInterviewInst({
      interviewInstId: surveyId,
      interviewInstStatus: '2'
    }).then(() => {
      console.log('[H5] Updated interview status to 2');
    }).catch(err => {
      console.warn('[H5] Failed to update interview status:', err);
    });
    // 手动更新 ref 以应对可能的 React 异步更新延迟，确保定时器中能读到预期状态
    isRecordingRef.current = true;

    // 延时检测录音是否真正开启成功
    setTimeout(() => {
      const statusHandler = (response: any) => {
        nativeBridge.off('getRecordingStatus', statusHandler);
        console.log('[RecordingPage] Check Recording Status:', response);

        // 判定失败的条件: success为false，或者 data 明确表示未录音 (0, false, '0', 'false')
        // 注意: 具体根据 Native 返回值调整。这里假设 data 为 true/1/'1'/object 表示成功
        const isRecordingActive = response.success &&
          response.data !== false &&
          response.data !== 0 &&
          response.data !== '0' &&
          response.data !== 'false';

        if (!isRecordingActive) {
          console.warn('[RecordingPage] Native recording failed to start.');
          // 只有当前状态认为是“录音中”才去切换状态，防止用户已手动暂停导致的误操作
          if (isRecordingRef.current) {
            Toast({
              message: '录音开启失败，请点击重试',
            });
            // 使用 ref 调用最新的 onToggleRecording 并强制设为 false
            onToggleRecordingRef.current(false);
          }
        }
      };

      nativeBridge.on('getRecordingStatus', statusHandler);
      nativeBridge.getRecordingStatus();
    }, 5000);
  };

  useEffect(() => {
    if (countdown > 0) {
      // 当倒计时到达 1 时，触发录音逻辑
      if (countdown === 1) {
        // We need a small delay or the next tick to ensure UI update
        // But logic-wise, we just start recording
        setTimeout(() => {
          startNativeRecord();
        }, 800);
      }

      const timer = setTimeout(() => {
        setCountdown(prev => prev - 1);
      }, 1000);    
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Return statement starts here
  return (
    <div className="fixed inset-0 flex flex-col bg-[#F7F8FA]">

      {/* NavBar */}
      <div className="bg-white px-4 py-3 flex items-center justify-between sticky top-0 z-20 shadow-sm">
        <button onClick={onBack} className="p-2 -ml-2 text-slate-700">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-lg font-bold text-slate-800 flex-1 flex justify-center overflow-hidden">
          {showTimeTitle ? (
            <div className="bg-[#F2F3F5] px-4 py-1.5 rounded-full flex items-center gap-2 animate-fadeIn">
              <Clock size={16} className="text-slate-600" />
              <span className="text-slate-800 font-mono text-[16px] leading-none mb-[1px]">
                {formatTime(seconds)}
              </span>
            </div>
          ) : (
            <div className="truncate px-4">
              {interviewInstTitle || deal?.interviewCust || '访谈录音'}
            </div>
          )}
        </h1>
        <button
          className="p-2 -mr-2 text-slate-700"
          onClick={onHistoryClick}
        >
          <HistoryIcon size={18} />
        </button>
      </div>

      {/* Header Area: Timer & SoundWave */}


      <div 
        ref={scrollContainerRef}
        className={`flex-1 relative min-h-0 bg-[#F7F8FA] scroll-smooth ${countdown > 0 ? 'overflow-hidden' : 'overflow-y-auto'}`}
        style={{ WebkitOverflowScrolling: 'touch' }}
        onScroll={handleScroll}
      >
        {/* Header - Moved Inside for Scroll */}
        <div ref={headerRef} className="bg-white pt-6 pb-2 text-center relative z-10">
           <SoundWave isRecording={isRecording} />
           <div className="mt-2 text-3xl font-mono font-medium text-slate-800 tracking-wider">
             {formatTime(seconds)}
           </div>
        </div>
        {countdown > 0 && (
          <div className="absolute inset-0 z-50 bg-white flex flex-col items-center pt-24">
            <div className="w-56 h-56 flex items-center justify-center relative">
              <img
                src="/talk-assistant/assets/startrecorde.png"
                alt="Countdown Bear"
                className="w-full h-full object-contain"
              />
              <span
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-5xl font-extrabold text-primary mt-8"
              >
                {countdown}
              </span>
            </div>
            <p className="mt-4 text-indigo-600 font-bold text-lg animate-pulse">准备开始录音...</p>
          </div>
        )}

        {/* Tabs */}
        {/* Tabs */}
        <div className="sticky top-0 z-40 bg-white mt-1 border-t border-gray-100 shadow-sm transition-all">
          <div className="flex">
            <button
              className={`flex-1 py-3 text-sm font-medium relative transition-colors ${activeTab === 'questions' ? 'text-indigo-600' : 'text-gray-500'}`}
              onClick={() => setActiveTab('questions')}
            >
              问题清单
              {activeTab === 'questions' && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-[3px] bg-indigo-600 rounded-t-full" />
              )}
            </button>
            <button
              className={`flex-1 py-3 text-sm font-medium relative transition-colors ${activeTab === 'transcription' ? 'text-indigo-600' : 'text-gray-500'}`}
              onClick={() => setActiveTab('transcription')}
            >
              录音转写
              {activeTab === 'transcription' && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-[3px] bg-indigo-600 rounded-t-full" />
              )}
            </button>
          </div>
        </div>

        {/* Scrollable Content Area */}
        {/* Scrollable Content Area Wrapper */}
        <div className="px-4 pb-0 pt-2 relative">

          {/* Question List Tab */}
          <div className={activeTab === 'questions' ? 'block' : 'hidden'}>
            <div className="space-y-3 pb-20">
              <div className="text-xs text-gray-400 mb-2 pl-1">已自动匹配 {questions.filter(q => q.isAnswered).length} / {questions.length} 项</div>
              {questions.map((q, index) => (
                <div key={q.id} className="bg-white rounded-xl px-4 py-3 shadow-sm border border-gray-50 transition-all">
                  <div
                    className="flex items-center justify-between cursor-pointer py-1"
                    onClick={() => q.details && setExpandedQuestion(expandedQuestion === q.id ? null : q.id)}
                  >
                    <h3 className={`flex-1 text-[15px] leading-snug font-medium pr-3 ${q.isAnswered ? 'text-gray-800' : 'text-gray-500'}`}>
                      {index + 1}. {q.text}
                    </h3>

                    <div className="flex items-center gap-3">
                      {q.details && (
                        <div className="text-gray-400">
                          {expandedQuestion === q.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </div>
                      )}

                      <div className="min-w-[20px]">
                        {q.isAnswered ? (
                          <div className="text-indigo-600">
                            <CheckCircle size={22} fill="white" />
                          </div>
                        ) : (
                          <div className="w-[18px] h-[18px] rounded-full border border-gray-300 ml-[2px]"></div>
                        )}
                      </div>
                    </div>
                  </div>

                  {expandedQuestion === q.id && q.details && (
                    <div className="mt-3 bg-slate-50 p-3 rounded-lg border border-slate-100 relative">
                        <div className="text-sm text-slate-600 leading-relaxed flex gap-2 mb-4">
                            <span className="text-[10px] text-indigo-500/80 font-bold shrink-0 flex flex-col leading-tight mt-1 items-start">
                              <span>参考</span>
                              <span>答案：</span>
                            </span>
                            <span className="pt-0.5">{q.details}</span>
                        </div>
                        {q.answerTime && (
                           <div className="absolute bottom-1.5 right-2 px-1 text-[10px] text-slate-400 font-medium scale-90 origin-right">
                              {(() => {
                                 try {
                                    const date = new Date(q.answerTime);
                                    const Y = date.getFullYear();
                                    const M = String(date.getMonth() + 1).padStart(2, '0');
                                    const D = String(date.getDate()).padStart(2, '0');
                                    const h = String(date.getHours()).padStart(2, '0');
                                    const m = String(date.getMinutes()).padStart(2, '0');
                                    const s = String(date.getSeconds()).padStart(2, '0');
                                    return `${Y}-${M}-${D} ${h}:${m}:${s}`;
                                 } catch(e) {
                                    return q.answerTime;
                                 }
                              })()}
                           </div>
                        )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Transcription (Chat) Tab */}
          <div className={activeTab === 'transcription' ? 'block' : 'hidden'}>

            {/* DEBUG: Show transcriptionList RAW DATA - Logged to console instead if needed */}

            <div className="space-y-6 pb-32">
              {/* 转写列表容器 */}
              <div className="space-y-4 px-1">
                {transcriptionList.length > 0 && (
                  <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                    {/* 容器头部信息 */}
                    <div className="flex items-center justify-between gap-1 mb-4 pb-2 border-b border-slate-50">
                      {/* 左侧：时间段 */}
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-[#F2F3F5] px-2.5 py-1 rounded-full whitespace-nowrap shrink-0">
                        <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                          <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5"/>
                          <path d="M7 3.5V7L9.5 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                        <span className="font-medium font-mono">
                           00:00 - {formatTime(seconds).substring(3)}
                        </span>
                      </div>

                      {/* 右侧：标签与操作 */}
                      <div className="flex items-center gap-1.5 whitespace-nowrap ml-auto shrink-0">
                        {/* 智能精修标签 */}
                        <div className="flex items-center gap-1 bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded text-[10px] font-medium border border-indigo-100">
                           <img 
                             src={fixIcon} 
                             alt="fix"
                             className="w-[10px] h-[10px] shrink-0" 
                           />
                           智能精修
                        </div>
                        
                        {/* 收起按钮 */}
                        <div 
                          onClick={() => setIsTranscriptionCollapsed(!isTranscriptionCollapsed)}
                          className="flex items-center gap-0.5 text-slate-400 text-xs cursor-pointer hover:text-slate-600 active:scale-95 transition-transform"
                        >
                          {isTranscriptionCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                          <span>{isTranscriptionCollapsed ? '展开' : '收起'}</span>
                        </div>
                      </div>
                    </div>

                    {/* 对话列表内容 */}
                    {!isTranscriptionCollapsed && (
                      <div className="space-y-6">
                        {transcriptionList.map((item, index) => {
                          if (!item.content?.trim()) return null;
                          const isRecognizing = item.isFinal === false && index === transcriptionList.length - 1;

                          return (
                            <div key={item.id || index} className="flex gap-3 flex-row">
                              {/* Avatar */}
                              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-blue-50 border border-blue-100">
                                <User size={16} className="text-blue-500" fill="currentColor" />
                              </div>

                              <div className="flex-1 flex flex-col items-start min-w-0">
                                {/* Name Label */}
                                <div className="flex items-center gap-2 mb-1.5 ml-1">
                                  <span className="text-xs text-slate-500 font-medium">
                                    {item.contentType || `访谈对象${item.roleId || index + 1}`}
                                  </span>
                                  {isRecognizing && (
                                    <span className="inline-flex items-center gap-0.5 text-[10px] text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded">
                                      <span className="w-1 h-1 bg-indigo-500 rounded-full animate-bounce"></span>
                                      识别中
                                    </span>
                                  )}
                                </div>

                                {/* Chat Bubble */}
                                <div className={`p-3.5 rounded-2xl rounded-tl-sm text-[15px] leading-relaxed w-full shadow-[0_2px_8px_rgba(0,0,0,0.02)]
                                  ${isRecognizing
                                    ? 'bg-indigo-50/50 text-indigo-900 border border-indigo-100'
                                    : 'bg-slate-50 text-slate-700 border border-slate-100'
                                  }`}
                                >
                                  {item.content || '暂无内容'}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
                
                {/* 空状态提示 (仅当不在录音且无内容时显示) */}
                {transcriptionList.length === 0 && !isRecording && (
                   <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                     <p className="text-sm">暂无转写记录</p>
                   </div>
                )}

                {/* 录音时显示深度转写容器 (始终显示在底部) */}
                {isRecording && (() => {
                  // 计算当前分钟段的起始和结束时间
                  const currentMinute = Math.floor(seconds / 60);
                  const startTime = currentMinute * 60;
                  const endTime = (currentMinute + 1) * 60;
                  
                  // 计算当前60秒内的进度百分比
                  const progressPercent = ((seconds % 60) / 60) * 100;

                  return (
                    <div className="py-2">
                       {/* 容器的装饰头部（时间显示） */}
                       <div className="inline-flex items-center gap-2 text-xs text-slate-500 bg-[#F2F3F5] border border-transparent px-3 py-1.5 rounded-full mb-3 ml-1">
                        <svg width="12" height="12" viewBox="0 0 14 14" fill="none" className="text-slate-400">
                          <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5"/>
                          <path d="M7 3.5V7L9.5 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                        <span className="font-medium font-mono">
                          {formatTime(startTime).substring(3)}-{formatTime(endTime).substring(3)}
                        </span>
                      </div>

                      {/* 深度转写中容器 */}
                      <div className="bg-gradient-to-br from-indigo-50 via-white to-purple-50 rounded-2xl p-6 border border-indigo-100/60 shadow-[0_4px_12px_rgba(79,70,229,0.05)]">
                        <div className="text-center">
                          {/* 标题 */}
                          <div className="text-indigo-600 font-medium mb-5 flex items-center justify-center gap-2.5">
                            <span className="relative flex h-3 w-3">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
                            </span>
                            <span className="tracking-wide text-sm">深度转写中...</span>
                          </div>

                          {/* 进度条 */}
                          <div className="relative w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mb-4 mx-auto max-w-[80%]">
                            <div 
                              className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 transition-all duration-1000 ease-linear"
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>

                          {/* 提示文字 */}
                          <p className="text-xs text-slate-400 font-light tracking-wider scale-90">
                            正在进行语义对齐与降噪优化
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Dummy element for auto-scroll removed */}
            </div>
          </div>
        </div>

      </div>

      {/* Sticky Bottom Bar */}
      {countdown === 0 && (
        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto px-4 pb-3 z-30">
          <div className="flex gap-4 items-center justify-between">
            <Button
              variant="primary"
              onClick={handleToggleWrapperThrottled}
              className="flex-1 rounded-full shadow-lg shadow-indigo-200"
            >
              {isRecording ? (
                <>
                  <Pause size={18} className="mr-2" /> 暂停录音
                </>
              ) : (
                <>
                  <Mic size={18} className="mr-2" /> {(seconds === 0) ? '开始录音' : '继续录音'}
                </>
              )}
            </Button>

            {seconds > 0 && (
              <Button
                variant="secondary"
                onClick={handleFinishInterviewThrottled}
                className="flex-1 rounded-full border-indigo-100 text-indigo-600"
              >
                <Square size={16} className="mr-2 fill-current" /> 结束访谈
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RecordingPage;
