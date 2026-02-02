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
  User
} from 'lucide-react';
import { Dialog, Toast } from 'react-vant';
import SoundWave from '../components/SoundWave';
import Button from '../components/Button';
import { Question, DealRecord } from '../types';
import { dealService } from '../services/dealService';

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
  const { transcriptionList, setTranscriptionList } = useRecordingStore();
  console.log('[RecordingPage] transcriptionList', transcriptionList);

  const resetStore = useRecordingStore(state => state.reset);

  // Scroll container ref
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

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
        details: item.questionAnswer || undefined
      }));
      setQuestions(backendQuestions);
    }
  }, [deal]);


  useEffect(() => {
    // 只有在以下情况才调用接口获取历史转写记录：
    // 1. 有 interviewInstId
    // 2. 列表为空（首次进入）
    // 3. 不在录音中（正在录音时内容来自 Native 实时推送）
    if (interviewInstId && transcriptionList.length === 0 && !isRecording) {
      const fetchTranscription = async () => {
        try {
          const res = await dealService.queryInterviewInstContentListByPage({
            interviewInstId,
            pageNum: 1,
            pageSize: 100 // 暂时获取前100条
          });
          if (res.success && res.data && res.data.records) {
            // 过滤掉 type=4 (补充资料语音录入) 的内容，不展示在转写列表中
            const filteredRecords = res.data.records.filter((item: any) => item.type !== '4');
            setTranscriptionList(filteredRecords);
          }
        } catch (error) {
          console.error('获取转写记录失败', error);
        }
      };
      fetchTranscription();
    }
  }, [interviewInstId, transcriptionList.length, isRecording, setTranscriptionList]);

  const formatTime = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 上传转写内容到服务器
  const uploadTranscriptionContent = async () => {
    if (!interviewInstId) {
      return;
    }

    // 只上传最终结果（isFinal: true）
    const finalResults = transcriptionList.filter(item => item.isFinal);

    if (finalResults.length === 0) {
      console.log('[上传转写] 没有需要上传的内容');
      return;
    }

    try {
      const contentList = finalResults.map(item => ({
        id: item.roleId,
        content: item.content,
      }));

      // DEBUG: Upload Content List
      console.log('[上传转写] Content List:', JSON.stringify(contentList, null, 2));

      console.log('[上传转写] 上传内容:', contentList.length, '条');

      await dealService.uploadInterviewInstContent({
        interviewInstId,
        contentList,
      });

      console.log('[上传转写] 上传成功');
    } catch (error) {
      console.error('[上传转写] 上传失败:', error);
    }
  };



  // 上传锁
  const isUploadingRef = React.useRef(false);

  // 获取并上传录音文件
  const uploadRecordingFile = async (): Promise<boolean> => {
    if (!interviewInstId) {
      console.log('[上传录音] 没有 interviewInstId');
      return false;
    }

    if (isUploadingRef.current) {
      console.log('[上传录音] 已经在上传中，跳过本次调用');
      return true;
    }
    isUploadingRef.current = true;

    // 从 Native 获取录音文件（所有环境统一使用）
    try {
      return await new Promise((resolve) => {
        // 设置回调监听
        const handleAudioList = async (response: any) => {
          nativeBridge.off('getAudioList', handleAudioList); // 移除监听

          // DEBUG: Audio List Response logged to console
          console.log("--- AUDIO LIST RESP ---", JSON.stringify(response, null, 2));

          if (response.success && response.data && response.data.list && response.data.list.length > 0) {
            // 获取最新的录音文件（通常是列表的第一个）
            const latestAudio = response.data.list[0];
            try {
              const rawFileUrl = latestAudio.fileURL || "";
              const fileUrl = rawFileUrl.trim();

              console.log('[上传录音] 调用 Native 上传接口, filePath:', fileUrl);

              // DEBUG: Native Upload Progress
              console.log(`Native Uploading: ${fileUrl}...`);

              // 获取 Token
              const token = localStorage.getItem('zov-user-token') || '';

              const uploadHost = config.uploadUrl; // 环境配置

              const params = {
                host: uploadHost,
                authorization: token,
                filePath: fileUrl,
                // interviewInstId: Number(interviewInstId)
              }
              console.log('[上传录音] Upload Params:', JSON.stringify(params, null, 2));

              const uploadPromise = new Promise<boolean>((resolveUpload, rejectUpload) => {
                const handleUploadResult = (res: any) => {
                  console.log('[上传录音] Upload Result:', JSON.stringify(res, null, 2));

                  // 1. 先检查 Bridge 层面是否调用成功
                  if (res.success === false) {
                    nativeBridge.off('onUploadResult', handleUploadResult);
                    rejectUpload(new Error(res.message || 'Native Bridge Call Failed'));
                    return;
                  }

                  if (!res.data) return; // 忽略空数据回调

                  // 2. 更新 Toast 进度让用户感知
                  // if (res.data.percent !== undefined) {
                  //    Toast.loading({ message: `正在保存 ${res.data.percent}%`, forbidClick: true, duration: 0 });
                  // }

                  // 3. 检查最终结果
                  // 注意：有些 Native 实现可能把结果直接放在 data 里，而不是 data.result，这里做下兼容防御
                  const resultData = res.data.result || (res.data.success !== undefined ? res.data : null);

                  if (resultData) {
                    console.log('[上传录音] Parsed Result Data:', JSON.stringify(resultData));

                    // 上传完成（无论成功失败）
                    // 兼容 errno=0 (富文本编辑器常用格式) 或 success=true
                    const isSuccess = resultData.success === true || resultData.errno === 0;

                    if (isSuccess) {
                      nativeBridge.off('onUploadResult', handleUploadResult);

                      // Native 上传成功后，获取 URL 并调用后端接口绑定
                      // 尝试多种路径获取 URL
                      const fileUrl = resultData.data?.url || resultData.url || (typeof resultData.data === 'string' ? resultData.data : "");
                      console.log('[上传录音] Native上传成功，URL:', fileUrl);

                      if (fileUrl) {
                        console.log('[上传录音] 调用saveInterviewInstRecordFile请求参数:', {
                          path: fileUrl,
                          interviewInstId: interviewInstId
                        });
                        // 调用 saveInterviewInstRecordFile 保存记录
                        dealService.saveInterviewInstRecordFile({
                          path: fileUrl,
                          interviewInstId: interviewInstId
                        }).then(saveRes => {
                          if (saveRes.success) {
                            console.log('[上传录音] 绑定记录成功');
                            Toast.clear();
                            resolveUpload(true);
                          } else {
                            console.error('[上传录音] 绑定记录失败:', saveRes.message);
                            // 绑定失败是否算整体失败？通常算，但文件已上传。
                            // 这里我们 reject 以提示用户
                            Toast.clear();
                            rejectUpload(new Error(saveRes.message || '绑定录音失败'));
                          }
                        }).catch(err => {
                          console.error('[上传录音] 绑定接口异常:', err);
                          Toast.clear();
                          rejectUpload(new Error('绑定录音接口异常'));
                        });
                      } else {
                        console.warn('[上传录音] 未获取到文件 URL, resultData:', JSON.stringify(resultData));
                        resolveUpload(true); // 虽无URL但Native报成功，暂时resolve
                      }
                    } else {
                      console.warn('[上传录音] Native返回成功但业务失败:', resultData.message);
                      // 只有明确失败才 reject
                      if (resultData.success === false || (resultData.errno !== undefined && resultData.errno !== 0)) {
                        nativeBridge.off('onUploadResult', handleUploadResult);
                        rejectUpload(new Error(resultData.message || 'Upload Failed'));
                      }
                    }
                  }
                };

                nativeBridge.on('onUploadResult', handleUploadResult);

                nativeBridge.uploadInterviewFile(params);


                // 设置超时
                setTimeout(() => {
                  nativeBridge.off('onUploadResult', handleUploadResult);
                  rejectUpload(new Error('Upload Timeout (60s)'));
                }, 60000);
              });

              await uploadPromise;
              console.log('[上传录音] 上传流程结束');
              resolve(true);

            } catch (error: any) {
              resolve(false);
            }
          } else {
            console.log('[上传录音] 没有找到录音文件');
            resolve(false);
          }
        };

        // 注册回调
        nativeBridge.on('getAudioList', handleAudioList);

        // 调用 Native 获取音频列表
        console.log('[上传录音] 查询录音文件, surveyId:', interviewInstId);
        nativeBridge.getAudioList({
          surveyId: interviewInstId,
          page: 0,
          pageSize: 999,
        });
      });
    } finally {
      isUploadingRef.current = false;
    }
  };

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
          // 只有在录音中才执行：停止录音 + 上传文件/转写
          if (isRecording) {
            nativeBridge.stopRecording();
            try {
              await Promise.all([
                uploadRecordingFile(),
                uploadTranscriptionContent()
              ]);
            } catch (e) {
              console.error('上传过程异常:', e);
            }
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

      // 暂停时先尝试上传转写内容
      await uploadTranscriptionContent();

      // 上传后再刷新 Deal 详情，确保获取最新状态
      refreshDealInfo();

      // 延迟刷新：后端生成答案可能需要时间，非阻塞式轮询更新
      setTimeout(() => refreshDealInfo(), 2500);
      setTimeout(() => refreshDealInfo(), 5000);
      setTimeout(() => refreshDealInfo(), 10000);
      setTimeout(() => refreshDealInfo(), 15000);

      // 同时上传录音文件
      uploadRecordingFile();
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

          // 更新 Store
          setData({
            interviewInstId: currentInstId,
            title: instTitle,
            dealId: deal.id
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

    // Update global store
    if (deal?.id) {
      setData({ dealId: deal.id });
    }

    nativeBridge.startRecordingWithParams({ surveyId, roleType: 2 });
    onToggleRecording();
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
            Toast.fail('录音开启失败，请点击重试');
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

  return (
    <div className="fixed inset-0 flex flex-col bg-[#F7F8FA]">

      {/* NavBar */}
      <div className="bg-white px-4 py-3 flex items-center justify-between sticky top-0 z-20 shadow-sm">
        <button onClick={onBack} className="p-2 -ml-2 text-slate-700">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-lg font-bold text-slate-800">
          {interviewInstTitle || deal?.interviewCust || '访谈录音'}
        </h1>
        <button
          className="p-2 -mr-2 text-slate-700"
          onClick={onHistoryClick}
        >
          <HistoryIcon size={18} />
        </button>
      </div>

      {/* Header Area: Timer & SoundWave */}
      <div className="bg-white pt-6 pb-2 text-center z-10">
        <SoundWave isRecording={isRecording} />
        <div className="mt-2 text-3xl font-mono font-medium text-slate-800 tracking-wider">
          {formatTime(seconds)}
        </div>
      </div>

      <div className="flex-1 flex flex-col relative min-h-0">
        {countdown > 0 && (
          <div className="absolute inset-0 z-50 bg-white flex flex-col items-center pt-24">
            <div className="w-56 h-56 flex items-center justify-center relative">
              <img
                src="/talk-assistant/assets/startrecorde.png"
                alt="Countdown Bear"
                className="w-full h-full object-contain"
              />
              <span
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-5xl font-extrabold mt-8 mr-1 transform rotate-[-5deg] text-primary"
              >
                {countdown}
              </span>
            </div>
            <p className="mt-4 text-indigo-600 font-bold text-lg animate-pulse">准备开始录音...</p>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white mt-1 border-t border-gray-100 z-10 transition-all">
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
        <div
          ref={scrollContainerRef}
          className="flex-1 h-0 w-full overflow-y-auto px-4 scroll-smooth relative"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >

          {/* Question List Tab */}
          <div className={activeTab === 'questions' ? 'block' : 'hidden'}>
            <div className="space-y-3 pb-32">
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
                    <div className="mt-3 text-sm text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100 flex gap-2">
                      <span className="text-indigo-500 font-bold shrink-0">A:</span>
                      <span>{q.details}</span>
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
              {transcriptionList.length > 0 ? (
                transcriptionList.map((item, index) => {
                  if (!item.content?.trim()) return null;
                  const isRecognizing = item.isFinal === false && index === transcriptionList.length - 1;

                  return (
                    <div key={item.id || index} className="flex gap-3 flex-row">
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-orange-100">
                          <User size={16} className="text-orange-600" fill="currentColor" />
                        </div>
                      </div>

                      <div className="flex-1 flex flex-col items-start">
                        {/* Name Label with recognizing indicator */}
                        <div className={`text-xs mb-1.5 flex items-center gap-1 ml-1 ${isRecognizing ? 'text-gray-400' : 'text-gray-500'}`}>
                          访谈对象{item.roleId || index + 1}
                          {isRecognizing && (
                            <>
                              <span className="inline-block w-1 h-1 bg-gray-400 rounded-full animate-pulse"></span>
                              <span className="text-[10px]">识别中...</span>
                            </>
                          )}
                        </div>

                        {/* Chat Bubble */}
                        <div className={`p-3.5 rounded-xl rounded-tl-sm text-[15px] leading-relaxed max-w-[90%] break-words shadow-sm
                          ${isRecognizing
                            ? 'bg-indigo-50 text-indigo-600 border border-indigo-100 opacity-80'
                            : 'bg-white border border-gray-100 text-slate-700'
                          }`}
                        >
                          {item.content || '暂无内容'}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <p className="text-sm">暂无转写记录</p>
                </div>
              )}

              {/* Dummy element for auto-scroll removed */}
            </div>
          </div>
        </div>

      </div>

      {/* Sticky Bottom Bar */}
      {countdown === 0 && (
        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto px-4 pb-6 z-30">
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