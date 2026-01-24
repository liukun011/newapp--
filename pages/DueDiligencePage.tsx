import React, { useState, useEffect } from 'react';
import { ArrowLeft, Pencil, Mic, ChevronRight, FilePlus, Camera, Image as ImageIcon, FileText, Archive } from 'lucide-react';
import { Toast, Dialog } from 'react-vant';
import Mascot from '../components/Mascot';
import { COLORS } from '../constants';
import { DealRecord, DealReportStatusEnum } from '../types';
import { dealService } from '../services/dealService';
import { nativeBridge } from '@/services/nativeBridge';

interface DueDiligencePageProps {
  deal: DealRecord | null;
  onBack: () => void;
  onNavigateToRecording: () => void;
  onNavigateToMaterials: () => void;
  onNavigateToQuestions?: () => void;
  onEditInfo?: () => void;
  onChangeTemplate?: () => void;
  onPreviewReport?: (name: string, reportUrl: string, previewUrl: string) => void;
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

  const handleUploadClick = (id: string) => {
    // 检测是否为安卓环境
    const isAndroid = /Android/i.test(navigator.userAgent) || (window as any)._dsbridge;

    switch (id) {
      case 'camera':
        if (isAndroid) {
          nativeBridge.openCamera();
        } else {
          cameraInputRef.current?.click();
        }
        break;
      case 'gallery':
        if (isAndroid) {
          nativeBridge.openPhotoLibrary();
        } else {
          galleryInputRef.current?.click();
        }
        break;
      case 'file':
        if (isAndroid) {
          nativeBridge.chooseFile();
        } else {
          fileInputRef.current?.click();
        }
        break;
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    if (!currentDeal?.id) {
      Toast.fail('未找到尽调实例');
      return;
    }

    const file = files[0];
    try {
      Toast.loading({ message: '上传中...', duration: 0 });
      const res = await dealService.uploadDealMaterial(currentDeal.id, file);
      Toast.clear();

      if (res.success) {
        Toast.success('上传成功');
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

  const uploadOptions = [
    { id: 'camera', label: '相机', icon: Camera },
    { id: 'gallery', label: '相册', icon: ImageIcon },
    { id: 'file', label: '文件', icon: FileText },
  ];
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
        <button onClick={onBack} className="p-2 -ml-2 text-slate-700 hover:bg-white/50 rounded-full">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-lg font-bold text-slate-800">{currentDeal?.interviewCust || '尽调详情'}</h1>
        {currentDeal?.status === '5' ? (
          <div className="w-9" />
        ) : (
          <button 
            onClick={onEditInfo}
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
              onClick={async () => {
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
                      // 使用报告预览页面打开
                      onPreviewReport?.(
                        currentDeal.report.fileName || '尽调报告',
                        currentDeal.report.fileUrl,
                        res.data
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
              }}
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
            <div className="bg-[#5047E9] px-4 py-2 relative z-10 flex justify-end gap-3 items-center" style={{ minHeight: '52px' }}>
                {(currentDeal?.status === '5') ? (
                  // 已归档状态：仅显示立即下载
                  <button 
                    onClick={() => {
                      if (currentDeal?.report?.fileUrl && currentDeal?.report?.fileName) {
                        try {
                          const link = document.createElement('a');
                          link.href = currentDeal.report.fileUrl;
                          link.download = currentDeal.report.fileName || '尽调报告.docx';
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                          Toast.success('开始下载');
                        } catch (error) {
                          console.error('Download failed:', error);
                          Toast.fail('下载失败');
                        }
                      } else {
                        Toast.fail('报告文件不存在');
                      }
                    }}
                    className="px-6 py-2 bg-transparent border border-white/40 text-white rounded-full text-sm font-medium active:scale-95 transition-transform"
                  >
                    立即下载
                  </button>
                ) : (
                  // 未归档状态：显示完整功能
                  <>
                    <button
                      onClick={() => {
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
                      }}
                      className="px-6 py-2 bg-white text-indigo-600 rounded-full text-sm font-bold shadow-md active:scale-95 transition-transform"
                    >
                      立即生成
                    </button>
                    <button 
                      onClick={() => {
                        if (currentDeal?.report?.fileUrl && currentDeal?.report?.fileName) {
                          try {
                            const link = document.createElement('a');
                            link.href = currentDeal.report.fileUrl;
                            link.download = currentDeal.report.fileName || '尽调报告.docx';
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            Toast.success('开始下载');
                          } catch (error) {
                            console.error('Download failed:', error);
                            Toast.fail('下载失败');
                          }
                        } else {
                          Toast.fail('报告文件不存在');
                        }
                      }}
                      className="px-6 py-2 bg-transparent border border-white/40 text-white rounded-full text-sm font-medium active:scale-95 transition-transform"
                    >
                      立即下载
                    </button>
                    <button 
                      className="px-6 py-2 bg-transparent border border-white/40 text-white rounded-full text-sm font-medium active:scale-95 transition-transform"
                      onClick={onChangeTemplate}
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
                    className="px-4 py-2 bg-white text-indigo-600 rounded-full text-sm font-bold shadow-md active:scale-95 transition-transform"
                  >
                    立即生成
                  </button>
                  <button 
                    className="px-4 py-2 bg-transparent border border-white/40 text-white rounded-full text-sm font-medium hover:bg-white/10 active:scale-95 transition-transform"
                    onClick={onChangeTemplate}
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
            onClick={onNavigateToMaterials}
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
                      onNavigateToMaterials();
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
                        handleUploadClick(opt.id);
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
                onClick={() => {
                  // 检查是否已归档
                  if (currentDeal?.status === '5') {
                    if (onNavigateToHistory && currentDeal?.id) {
                      onNavigateToHistory(currentDeal.id);
                    }
                    return;
                  }
                  onNavigateToRecording();
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border ${
                  currentDeal?.status === '5'
                    ? 'bg-indigo-50 text-indigo-600 border-indigo-100' // 恢复高亮样式
                    : 'bg-indigo-50 text-indigo-600 border-indigo-100'
                }`}
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
              onClick={onNavigateToQuestions}
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
          onClick={async () => {
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
                // 延迟返回，让用户看到成功提示
                setTimeout(() => {
                  onBack();
                }, 1000);
              } else {
                Toast.fail(res.message || '归档失败');
              }
            } catch (error) {
              Toast.clear();
              console.error('Archive failed:', error);
              Toast.fail('归档失败');
            }
          }}
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
    </div>
  );
};

export default DueDiligencePage;