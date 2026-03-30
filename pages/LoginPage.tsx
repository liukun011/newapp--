import React, { useState, useEffect } from 'react';
import { useThrottleFn } from '../hooks/useThrottleFn';
import { useKeyboardStatus } from '../hooks/useKeyboardStatus';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import Input from '../components/Input';
import Button from '../components/Button';
import { LOGIN_SLIDES } from '../constants';

import { authService } from '../services/authService';
import { Toast } from 'react-vant';

import { checkVConsoleForTestUser } from '../index';

interface LoginPageProps {
  onLogin: () => void;
}

type ViewState = 'LANDING' | 'SMS' | 'PASSWORD' | 'AGREEMENT' | 'PRIVACY' | 'FORGOT_PASSWORD';



const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const basePath = import.meta.env.BASE_URL || '/';
  const [viewState, setViewState] = useState<ViewState>('SMS');
  const [currentSlide, setCurrentSlide] = useState(0);
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [smsSent, setSmsSent] = useState(false);

  // 找回密码页面的独立状态（与登录页隔离）
  const [forgotPhone, setForgotPhone] = useState('');
  const [forgotCode, setForgotCode] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [forgotShowPassword, setForgotShowPassword] = useState(false);
  const [forgotShowConfirmPassword, setForgotShowConfirmPassword] = useState(false);
  const [forgotCountdown, setForgotCountdown] = useState(0);
  const [pageLoading, setPageLoading] = useState(true);
  const [showAgreementModal, setShowAgreementModal] = useState(false);
  const [previousViewState, setPreviousViewState] = useState<ViewState | null>(null);
  const [returnToModal, setReturnToModal] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const isAndroid = /Android/i.test(navigator.userAgent);
  
  // 键盘状态检测（用于隐藏底部复选框等）
  const keyboardStatus = useKeyboardStatus();
  // 仅在安卓端通过输入框聚焦状态来判定“键盘开启”，iOS 端保持原生行为
  const isKeyboardOpen = isAndroid ? (keyboardStatus || isInputFocused) : false;

  // 【仅安卓端】监听键盘物理收起动作：当键盘收起但输入框仍保持聚焦时，强制同步状态并失焦
  useEffect(() => {
    if (isAndroid && !keyboardStatus && isInputFocused) {
      setIsInputFocused(false);
      // 强制触发原生输入框失焦，确保页面能够正确滚回/恢复布局
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    }
  }, [keyboardStatus, isAndroid]);

  console.log('isKeyboardOpen', isKeyboardOpen, 'keyboardStatus', keyboardStatus, 'isInputFocused', isInputFocused, 'isAndroid', isAndroid);

  // Helper to enter agreement/privacy view
  const openLegalView = (target: 'AGREEMENT' | 'PRIVACY') => {
    setPreviousViewState(viewState);
    setViewState(target);
  };

  // Perform actual login logic
  const performLogin = async () => {
    const toast = Toast.loading({
      message: '登录中...',
      forbidClick: true,
      duration: 0,
    });

    if (isPasswordMode) {
      try {
        const res = await authService.login(phone, password);
        toast.clear();

        if (res.successful && res.data) {
          localStorage.setItem('zov-user-token', res.data.accessToken);
          
          // 获取完整用户信息并存储
          try {
            const infoRes = await authService.getUserInfo();
            if (infoRes.successful && infoRes.data) {
              localStorage.setItem('zov-user-info', JSON.stringify(infoRes.data));
            } else {
              localStorage.setItem('zov-user-info', JSON.stringify({ userId: res.data.userId }));
            }
          } catch (e) {
            console.error('Failed to get full user info:', e);
            localStorage.setItem('zov-user-info', JSON.stringify({ userId: res.data.userId }));
          }

          checkVConsoleForTestUser(phone);
          onLogin();
        } else {
           Toast.fail(res.message || '登录失败');
        }
      } catch (error) {
        toast.clear();
        console.error('Login error:', error);
      }
    } else {
       try {
         const res = await authService.loginWithPhoneCode(phone, code);
         toast.clear();

          if (res.successful && res.data) {
            localStorage.setItem('zov-user-token', res.data.accessToken);

            // 获取完整用户信息并存储
            try {
              const infoRes = await authService.getUserInfo();
              if (infoRes.successful && infoRes.data) {
                localStorage.setItem('zov-user-info', JSON.stringify(infoRes.data));
              } else {
                localStorage.setItem('zov-user-info', JSON.stringify({ userId: res.data.userId }));
              }
            } catch (e) {
              console.error('Failed to get full user info:', e);
              localStorage.setItem('zov-user-info', JSON.stringify({ userId: res.data.userId }));
            }

            checkVConsoleForTestUser(phone);
            onLogin();
          } else {
            Toast.fail(res.message || '登录失败');
          }
       } catch (error) {
         toast.clear();
         console.error('Login error:', error);
       }
    }
  };

  // Moved hooks to top level to comply with Rules of Hooks


  const handleMainLogin = useThrottleFn(async () => {
    if (!agreed) {
      setShowAgreementModal(true);
      return;
    }
    await performLogin();
  });

  const handleAgreementConfirm = () => {
    setAgreed(true);
    setShowAgreementModal(false);
    // If visibility was triggered by "One Click Login", ideally we should distinguish or just proceed with main login if form filled.
    // Given the flow, checking input validity for proceed is good.
    // But simplistic approach: if modal confirmed, user obviously wants to proceed.
    // However, we don't know which button triggered it. 
    // For simplicity: after confirming agreement, we execute the main login if we are in PASSWORD/SMS view.
    if (viewState === 'PASSWORD' || viewState === 'SMS') {
       if (phone && (password || code)) {
          performLogin();
       }
    }
  };

  // Countdown timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  // Forgot password countdown timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (forgotCountdown > 0) {
      timer = setTimeout(() => setForgotCountdown((c) => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [forgotCountdown]);

  // Auto-play carousel
  useEffect(() => {
    if (viewState !== 'SMS' && viewState !== 'PASSWORD') return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % LOGIN_SLIDES.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [viewState]);

  // Initial Loading Simulation
  useEffect(() => {
    const timer = setTimeout(() => {
      setPageLoading(false);
    }, 500); // 缩短 Loading 时间以优化体验
    return () => clearTimeout(timer);
  }, []);

  // Handle native back navigation for sub-views
  useEffect(() => {
    const handleNativeBack = (e: Event) => {
      // 忘记密码页面：返回密码页面
      if (viewState === 'FORGOT_PASSWORD') {
        e.preventDefault();
        setViewState('PASSWORD');
        return;
      }

      // 密码/验证码页面：拦截并退出
      if (viewState === 'SMS' || viewState === 'PASSWORD') {
        return;
      }

      // 协议/隐私页面：拦截并返回到上一页
      if (viewState === 'AGREEMENT' || viewState === 'PRIVACY') {
        e.preventDefault(); // 关键：阻止 App.tsx 的退出逻辑
        setViewState(previousViewState || 'SMS');
        if (returnToModal) {
          setShowAgreementModal(true);
          setReturnToModal(false);
        }
      }
    };

    window.addEventListener('requestNativeBack', handleNativeBack);
    return () => {
      window.removeEventListener('requestNativeBack', handleNativeBack);
    };
  }, [viewState, previousViewState, returnToModal]);

  if (pageLoading) {
    return (
      <div className="fixed inset-0 bg-white z-[999] flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
        <p className="text-gray-400 text-sm">资源加载中...</p>
      </div>
    );
  }

  // User Agreement View
  if (viewState === 'AGREEMENT') {
    return (
      <div className="fixed inset-0 z-50 bg-white flex flex-col">
        <div className="flex items-center px-4 py-3 border-b border-gray-100 bg-white flex-shrink-0">
          <button 
            onClick={() => {
              setViewState(previousViewState || 'SMS');
              if (returnToModal) {
                setShowAgreementModal(true);
                setReturnToModal(false);
              }
            }}
            className="p-2 -ml-2 text-slate-700 hover:bg-slate-50 rounded-full transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="flex-1 text-center text-lg font-bold text-slate-800 pr-8">用户协议</h1>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto p-6 text-slate-800 pb-10 overscroll-contain touch-pan-y" style={{ WebkitOverflowScrolling: 'touch' }}>
           <h2 className="text-xl font-bold mb-4">1. 引言</h2>
           <p className="text-[15px] leading-relaxed mb-6 text-justify text-slate-600">
             欢迎使用北京零壹视界科技有限公司提供的服务（以下简称“本服务”）。请在使用前仔细阅读并理解本《用户协议》（以下简称“本协议”）的所有条款。一旦您开始使用本服务，即视为您已充分理解并同意接受本协议所有条款。
           </p>

           <h2 className="text-xl font-bold mb-4">2. 服务范围</h2>
           <ul className="list-disc pl-5 space-y-2 mb-8 text-[15px] text-slate-600 leading-relaxed text-justify">
             <li>北京零壹视界科技有限公司（以下简称“本公司”）通过其官方网站或应用程序向用户提供服务。</li>
             <li>本公司有权调整服务内容，服务范围以本公司实际提供的服务为准。</li>
           </ul>

           <h2 className="text-xl font-bold mb-4">3. 用户行为规范</h2>
           <ul className="list-disc pl-5 space-y-2 mb-8 text-[15px] text-slate-600 leading-relaxed text-justify">
             <li>用户必须遵守国家相关法律法规及政策规定；</li>
             <li>禁止利用本服务从事任何违法活动；</li>
             <li>禁止侵犯他人隐私权、名誉权及其他合法权益；</li>
             <li>禁止上传、发布、传播任何恶意内容；</li>
             <li>对于违反上述规定的行为，本公司有权采取包括但不限于暂停服务、终止账户等措施，并保留追究法律责任的权利。</li>
           </ul>

           <h2 className="text-xl font-bold mb-4">4. 隐私保护</h2>
           <p className="text-[15px] leading-relaxed mb-6 text-justify text-slate-600">
             我们承诺将按照《隐私协议》的规定收集、使用和保护用户的个人信息；除获得用户明确同意或者《隐私协议》约定及法律法规规章和其他规定要求外，不会向第三方披露用户的个人信息。
           </p>

           <h2 className="text-xl font-bold mb-4">5. 知识产权声明</h2>
           <p className="text-[15px] leading-relaxed mb-6 text-justify text-slate-600">
             本公司拥有本服务中所有内容的知识产权；未经许可，任何人不得复制、转载、修改或用于商业目的。
           </p>

           <h2 className="text-xl font-bold mb-4">6. 免责条款</h2>
           <p className="text-[15px] leading-relaxed mb-6 text-justify text-slate-600">
             因不可抗力导致的服务中断或其他损失，本公司不承担责任；用户因自身原因造成的损害，本公司不承担赔偿责任；用户因第三方原因造成的损害，本公司不承担赔偿责任。
           </p>

           <h2 className="text-xl font-bold mb-4">7. 协议变更</h2>
           <p className="text-[15px] leading-relaxed mb-6 text-justify text-slate-600">
             本公司有权随时修改本协议的内容，并通过适当方式通知用户；若用户继续使用本服务，则视为接受更新后的协议。
           </p>

           <h2 className="text-xl font-bold mb-4">8. 法律适用与争议解决</h2>
           <p className="text-[15px] leading-relaxed mb-8 text-justify text-slate-600">
             本协议的解释及执行均适用中华人民共和国法律；如双方就本协议发生争议，应首先协商解决；协商不成时，任一方可提交至北京市海淀区人民法院诉讼解决。
           </p>
        </div>
      </div>
    );
  }

  // Privacy Policy View
  if (viewState === 'PRIVACY') {
    return (
      <div className="fixed inset-0 z-50 bg-white flex flex-col">
        <div className="flex items-center px-4 py-3 border-b border-gray-100 bg-white flex-shrink-0">
          <button 
            onClick={() => {
              setViewState(previousViewState || 'SMS');
              if (returnToModal) {
                setShowAgreementModal(true);
                setReturnToModal(false);
              }
            }}
            className="p-2 -ml-2 text-slate-700 hover:bg-slate-50 rounded-full transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="flex-1 text-center text-lg font-bold text-slate-800 pr-8">隐私政策</h1>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto p-6 text-slate-800 pb-10 overscroll-contain touch-pan-y" style={{ WebkitOverflowScrolling: 'touch' }}>
           <div className="mb-6 text-sm text-gray-500">
             <p>本版本发布日期：2026年1月28日</p>
             <p>生效日期：2026年1月28日</p>
           </div>
           
           <h2 className="text-xl font-bold mb-4">1. 引言</h2>
           <p className="text-[15px] leading-relaxed mb-8 text-justify text-slate-600">
             欢迎使用“小狸报告”（简称“本平台”）。作为一款专注于线下访谈与调研场景的效率工具，通过“录音转写 + 自动报告生成”双核心能力，帮助业务人员突破时空限制，显著提升现场信息整理与调研报告输出效率，为后续分析与决策提供清晰可靠的信息支持。本平台由北京零壹视界科技有限公司（简称“我们”）提供服务或运营控制。
           </p>
           <p className="text-[15px] leading-relaxed mb-8 text-justify text-slate-600">
             本隐私政策旨在向您说明我们在提供服务过程中如何收集、使用、存储及保护您的个人信息，并告知您所享有的权利。请在使用我们的产品或服务前仔细阅读并理解本隐私政策的所有内容。如果您对本隐私政策有任何疑问，请通过Email：<a href="mailto:support@binarysee.com" className="text-indigo-600 underline">support@binarysee.com</a>与我们联系。
           </p>

           <h2 className="text-xl font-bold mb-4">2. 信息收集</h2>
           <p className="text-[15px] leading-relaxed mb-3 text-justify text-slate-600">
             为了向您提供更加优质的服务，我们可能会根据业务需要收集如下类型的信息：
           </p>
           <ul className="list-disc pl-5 space-y-2 mb-8 text-[15px] text-slate-600 leading-relaxed text-justify">
             <li><strong>基本账户信息：</strong>如用户名、密码等。</li>
             <li><strong>个人资料信息：</strong>包括但不限于姓名、性别、年龄、出生日期、地址等。</li>
             <li><strong>联系信息：</strong>电话号码、电子邮件地址等。</li>
             <li><strong>日志信息：</strong>当您使用我们的服务时，系统自动记录的一些信息，比如IP地址、浏览器类型等。</li>
             <li><strong>其他信息：</strong>参与活动、调查问卷填写等情况下提供的额外信息。</li>
           </ul>
           <p className="text-[15px] leading-relaxed mb-8 text-justify text-slate-600">
             请注意，某些敏感信息只有在非常必要的情况下才会被要求提供，并且我们会采取适当的安全措施来保护这些数据。
           </p>

           <h2 className="text-xl font-bold mb-4">3. 信息使用</h2>
           <p className="text-[15px] leading-relaxed mb-3 text-justify text-slate-600">
             我们将基于以下目的使用收集到的个人信息：
           </p>
           <ul className="list-disc pl-5 space-y-2 mb-8 text-[15px] text-slate-600 leading-relaxed text-justify">
             <li>提供、维护及改进我们的产品及服务；</li>
             <li>包括第三方 AI 智能分析服务：为了向您提供报告生成功能，我们会将您主动上传的录音文件、照片及相关文本文件等资料加密传输至第三方 AI 服务商（阿里巴巴通义千问）进行处理。这些数据仅用于实现上述功能，我们不会将其用于其他商业用途；</li>
             <li>提供客户服务和支持，处理您的问题和反馈；</li>
             <li>安全保障：用于身份验证，防止欺诈行为；</li>
             <li>分析用户行为模式以优化用户体验；</li>
             <li>向您发送有关新功能、促销活动或其他重要通知的信息；</li>
             <li>遵守适用法律法规的要求。</li>
           </ul>

           <h2 className="text-xl font-bold mb-4">4. 信息共享</h2>
           <p className="text-[15px] leading-relaxed mb-3 text-justify text-slate-600">
             除非得到您的明确同意或依据相关法律要求，否则我们不会将您的个人信息出售给第三方。但在下列情形下，我们可能会分享部分信息：
           </p>
           <ul className="list-disc pl-5 space-y-2 mb-8 text-[15px] text-slate-600 leading-relaxed text-justify">
             <li>与合作伙伴共同提供某项服务；</li>
             <li>根据法律规定或政府机构要求披露信息；</li>
             <li>为保护公共利益、财产安全或个人安全而必须采取行动时；</li>
             <li>如果我们进行公司重组、合并、收购或出售等交易，您的个人信息可能会作为资产之一被转移。在这种情况下，我们将尽最大努力确保您的信息得到安全保护。</li>
           </ul>

           <h2 className="text-xl font-bold mb-4">5. 数据安全</h2>
           <p className="text-[15px] leading-relaxed mb-8 text-justify text-slate-600">
             我们非常重视用户信息安全，并采取了多种技术和组织性措施来确保数据的安全性和完整性，包括但不限于加密传输、定期审计、员工培训等手段。
           </p>

           <h2 className="text-xl font-bold mb-4">6. 您的权利</h2>
           <p className="text-[15px] leading-relaxed mb-3 text-justify text-slate-600">
             作为用户，您享有如下权利：
           </p>
           <ul className="list-disc pl-5 space-y-2 mb-8 text-[15px] text-slate-600 leading-relaxed text-justify">
             <li><strong>查阅权：</strong>有权查看我们持有的关于您的个人信息。</li>
             <li><strong>更正权：</strong>如果发现信息不准确，可请求更正。</li>
             <li><strong>删除权：</strong>在特定条件下，您可以要求删除您的个人信息。</li>
             <li><strong>限制处理权：</strong>在某些情况下，您可以请求暂停对您个人信息的处理。</li>
             <li><strong>反对权：</strong>对于直接营销等活动，您可以随时反对继续接收相关信息。</li>
             <li><strong>注销权：</strong>您随时可注销此前注册的账户。在注销账户之后，我们将停止为您提供产品或服务并依据您的要求，删除或匿名化您的信息。</li>
           </ul>

           <h2 className="text-xl font-bold mb-4">7. 隐私政策更新</h2>
           <p className="text-[15px] leading-relaxed mb-8 text-justify text-slate-600">
             随着业务发展和技术进步，本隐私政策可能会不定期进行修订。任何重大变更都将通过网站公告或其他合适的方式提前通知用户。建议您定期查阅本页面以获取最新版本。
           </p>

           <h2 className="text-xl font-bold mb-4">8. 获取应用内集成的第三方SDK服务收集的个人信息</h2>
           <p className="text-[15px] leading-relaxed mb-6 text-justify text-slate-600">
             为保障我们的应用软件实现相关功能,保障该APP安全稳定运行,我们会接入由第三方提供的软件开发包(SDK)实现使用目的。我们会对合作方获取信息的软件工具开发包(SDK)进行严格的安全监测，以保护用户的数据安全。
           </p>
           
           <div className="bg-gray-50 rounded-xl p-4 mb-4 text-[14px]">
             <h3 className="font-bold mb-2 text-slate-800">8.1 极光推送 – JPush SDK – Android</h3>
             <ul className="space-y-2 text-slate-600">
               <li><strong>公司名称：</strong>深圳市和讯华谷信息技术有限公司</li>
               <li><strong>使用目的：</strong>用于在移动设备上收取推送通知。</li>
               <li><strong>收集范围：</strong>
                 <ul className="list-disc pl-5 mt-1 space-y-1">
                   <li>设备标识符（包括Android ID、GAID、OAID、UAID、IDFA、AAID、Boot ID）：用于生成脱敏的终端用户设备唯一性标识；</li>
                   <li>设备硬件信息（包括设备型号、屏幕分辨率、制造商、存储空间）及操作系统信息：用于保证服务兼容性；</li>
                   <li>网络信息（包括网络类型、运营商信息、IP地址、DHCP、WIFI状态信息）：用于判断网络连接状态；</li>
                   <li>推送信息日志：用于查询推送服务记录；</li>
                   <li>地理位置及基站信息：用于判定模糊位置信息，选择就近推送服务节点。</li>
                 </ul>
               </li>
               <li><strong>隐私政策：</strong><a href="https://www.jiguang.cn/license/privacy" target="_blank" rel="noopener noreferrer" className="text-indigo-600 break-all">https://www.jiguang.cn/license/privacy</a></li>
               <li><strong>官网链接：</strong><a href="https://www.jiguang.cn/" target="_blank" rel="noopener noreferrer" className="text-indigo-600 break-all">https://www.jiguang.cn/</a></li>
             </ul>
           </div>
        </div>
      </div>
    );
  }


  // Forgot Password View
  if (viewState === 'FORGOT_PASSWORD') {
    return (
      <div className="min-h-screen bg-white flex flex-col p-6 relative">
        {/* Header (Back button omitted as per design or kept just in case but made transparent, I'll keep the back button to allow users to exit) */}
        <div className="flex items-center py-2 mb-8">
          <button 
            onClick={() => setViewState('PASSWORD')}
            className="p-2 -ml-2 text-slate-800 hover:bg-slate-50 rounded-full transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
        </div>

        {/* Title */}
        <div className="mb-12 flex justify-center">
          <h1 className="text-[26px] font-bold text-slate-800 tracking-wider">
            找回密码
          </h1>
        </div>

        {/* Inputs */}
        <div className="space-y-4">
          <Input 
            type="tel" 
            placeholder="请输入手机号" 
            value={forgotPhone}
            onChange={(e) => setForgotPhone(e.target.value)}
            onFocus={() => setIsInputFocused(true)}
            onBlur={() => setIsInputFocused(false)}
          />
          
          <Input 
            type="number" 
            placeholder="请输入6位验证码" 
            value={forgotCode}
            onChange={(e) => setForgotCode(e.target.value)}
            onFocus={() => setIsInputFocused(true)}
            onBlur={() => setIsInputFocused(false)}
            suffix={
              <button 
                disabled={forgotCountdown > 0}
                onClick={async () => {
                  if (!forgotPhone) {
                    Toast.info('请输入手机号');
                    return;
                  }
                  try {
                    const res = await authService.sendResetPwdSms(forgotPhone);
                    if (res.successful) {
                      setForgotCountdown(60);
                      Toast.success('验证码已发送');
                    } else {
                      Toast.fail(res.message || '发送失败');
                    }
                  } catch (error) {
                    console.error('Send SMS error:', error);
                  }
                }}
                className={`text-[15px] min-w-[5em] ${forgotCountdown > 0 ? 'text-gray-400' : 'text-[#1B6DFB] hover:text-blue-700'}`}
              >
                {forgotCountdown > 0 ? `${forgotCountdown}s` : '获取验证码'}
              </button>
            }
          />

          <Input 
            type={forgotShowPassword ? "text" : "password"} 
            placeholder="请输入新密码" 
            value={forgotNewPassword}
            onChange={(e) => setForgotNewPassword(e.target.value)}
            onFocus={() => setIsInputFocused(true)}
            onBlur={() => setIsInputFocused(false)}
            suffix={
              <button 
                type="button"
                onClick={() => setForgotShowPassword(!forgotShowPassword)}
                className="text-gray-400 p-1 hover:text-gray-600 focus:outline-none"
              >
                {forgotShowPassword ? <Eye size={18} /> : <EyeOff size={18} />}
              </button>
            }
          />

          <Input 
            type={forgotShowConfirmPassword ? "text" : "password"} 
            placeholder="请再次输入新密码" 
            value={forgotConfirmPassword}
            onChange={(e) => setForgotConfirmPassword(e.target.value)}
            onFocus={() => setIsInputFocused(true)}
            onBlur={() => setIsInputFocused(false)}
            suffix={
              <button 
                type="button"
                onClick={() => setForgotShowConfirmPassword(!forgotShowConfirmPassword)}
                className="text-gray-400 p-1 hover:text-gray-600 focus:outline-none"
              >
                {forgotShowConfirmPassword ? <Eye size={18} /> : <EyeOff size={18} />}
              </button>
            }
          />
        </div>

        {/* Action Button */}
        <div className="mt-12">
          <Button 
            block 
            size="large" 
            disabled={!forgotPhone || !forgotCode || !forgotNewPassword || !forgotConfirmPassword}
            onClick={async () => {
              if (forgotNewPassword !== forgotConfirmPassword) {
                Toast.info('两次输入的密码不一致');
                return;
              }
              try {
                const res = await authService.resetPassword({
                  mobile: forgotPhone,
                  captcha: forgotCode,
                  newPassword: forgotNewPassword,
                  confirmPassword: forgotConfirmPassword,
                });
                if (res.successful) {
                  Toast.success('密码重置成功');
                  // 重置找回密码表单
                  setForgotPhone('');
                  setForgotCode('');
                  setForgotNewPassword('');
                  setForgotConfirmPassword('');
                  setForgotCountdown(0);
                  setViewState('PASSWORD');
                } else {
                  Toast.fail(res.message || '重置失败');
                }
              } catch (error) {
                // request.ts 拦截器已全局弹出错误 Toast，此处不重复弹出
                console.error('Reset password error:', error);
              }
            }}
            className="shadow-md"
          >
            确定
          </Button>
        </div>
      </div>
    );
  }

  // Main Login View (SMS or Password)
  const isPasswordMode = viewState === 'PASSWORD';
  const slide = LOGIN_SLIDES[currentSlide];

  return (
    <div className="min-h-[100dvh] w-full flex flex-col bg-gradient-to-b from-[#E6EAFD] to-[#F1F3FD] relative overflow-x-hidden overflow-y-auto">
      {/* Top Carousel Area - Hide when keyboard is open to give more room for inputs on Android */}
      {!isKeyboardOpen && (
        <div className="relative z-10 flex-1 flex flex-col pt-16 min-h-0 w-full">
          {/* Text Content */}
          <div className="mb-2 flex flex-col justify-center items-center px-8 z-20 shrink-0">
            <h2 className="text-[22px] font-bold mb-3 leading-snug text-[#4338CA] text-center">
              {slide.title}
            </h2>
            <p className="text-[#64748B] text-[14px] leading-relaxed text-center font-medium max-w-[280px]">
              {slide.desc}
            </p>
          </div>
          
          {/* Slide Image */}
          <div className="w-full flex-1 flex items-end justify-center relative z-10">
            <img 
              src={`${basePath}assets/login${slide.id}.png`} 
              alt={slide.title}
              className="w-[280px] sm:w-[320px] h-auto object-contain object-bottom -mb-1"
            />
          </div>
        </div>
      )}

      {/* Bottom Sheet Card */}
      <div className="bg-white rounded-t-[32px] px-8 pt-6 pb-24 shadow-[0_-10px_40px_rgba(0,0,0,0.02)] z-20 flex flex-col w-full relative shrink-0">
        {/* Tabs */}
        <div className="flex gap-6 mb-6">
          <button 
            className={`text-[18px] font-bold relative pb-2 transition-colors ${!isPasswordMode ? 'text-slate-900' : 'text-slate-400'}`}
            onClick={() => setViewState('SMS')}
          >
            手机号登录
            {!isPasswordMode && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-[4px] bg-[#4338CA] rounded-full" />
            )}
          </button>
          <button 
            className={`text-[18px] font-bold relative pb-2 transition-colors ${isPasswordMode ? 'text-slate-900' : 'text-slate-400'}`}
            onClick={() => setViewState('PASSWORD')}
          >
            密码登录
            {isPasswordMode && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-[4px] bg-[#4338CA] rounded-full" />
            )}
          </button>
        </div>

        {/* Form Inputs */}
        <div className="space-y-4">
          {/* Phone Input */}
          <div className={`flex items-center border rounded-full px-5 py-3.5 transition-colors focus-within:border-[#4338CA] focus-within:ring-1 focus-within:ring-[#4338CA] ${phone ? 'border-[#4338CA] ring-1 ring-[#4338CA]' : 'border-[#BFC6FF]'}`}>
            <span className="text-slate-800 font-medium mr-4">+86</span>
            <input 
              type="tel"
              placeholder="请输入手机号"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onFocus={() => setIsInputFocused(true)}
              onBlur={() => setIsInputFocused(false)}
              className="flex-1 min-w-0 bg-transparent text-[15px] outline-none text-slate-800 placeholder-slate-400"
            />
          </div>

          {!isPasswordMode ? (
            /* SMS Code Input */
            <div className={`flex items-center border rounded-full px-5 py-3.5 transition-colors focus-within:border-[#4338CA] focus-within:ring-1 focus-within:ring-[#4338CA] ${code ? 'border-[#4338CA] ring-1 ring-[#4338CA]' : 'border-[#BFC6FF]'}`}>
              <input 
                type="number"
                placeholder="请输入验证码"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onFocus={() => setIsInputFocused(true)}
                onBlur={() => setIsInputFocused(false)}
                className="flex-1 min-w-0 bg-transparent text-[15px] outline-none text-slate-800 placeholder-slate-400"
              />
              <button 
                disabled={countdown > 0}
                onClick={async () => {
                  if (!phone) { Toast.info('请输入手机号'); return; }
                  try {
                    const res = await authService.sendSms(phone);
                    if (res.successful) { setCountdown(60); setSmsSent(true); Toast.success('验证码已发送'); }
                    else { Toast.fail(res.message || '发送失败'); }
                  } catch (e) {
                    console.error('Send SMS error:', e);
                  }
                }}
                className={`text-[14px] font-medium min-w-[5em] ${countdown > 0 ? 'text-slate-400' : 'text-[#4338CA]'}`}
              >
                {countdown > 0 ? `${countdown}s` : (smsSent ? '重新获取验证码' : '获取验证码')}
              </button>
            </div>
          ) : (
            /* Password Input */
            <div className={`flex items-center border rounded-full px-5 py-3.5 transition-colors focus-within:border-[#4338CA] focus-within:ring-1 focus-within:ring-[#4338CA] ${password ? 'border-[#4338CA] ring-1 ring-[#4338CA]' : 'border-[#BFC6FF]'}`}>
              <input 
                type={showPassword ? "text" : "password"}
                placeholder="请输入密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setIsInputFocused(true)}
                onBlur={() => setIsInputFocused(false)}
                className="flex-1 min-w-0 bg-transparent text-[15px] outline-none text-slate-800 placeholder-slate-400"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-slate-400 ml-2">
                {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
              </button>
            </div>
          )}
        </div>

        {/* Helper Text */}
        <div className="flex items-center justify-between mt-3 mb-6 px-1">
          {!isPasswordMode ? (
            <span className="text-[12px] text-slate-500">未注册的手机号登录成功后将自动注册</span>
          ) : (
            <>
              <span className="text-[12px] text-slate-500">请输入您的专属密码，继续访问个人账户</span>
              <button 
                onClick={() => setViewState('FORGOT_PASSWORD')}
                className="text-[12px] text-[#4338CA]"
              >
                忘记密码
              </button>
            </>
          )}
        </div>

        {/* Login Button */}
        <Button 
          block 
          size="large" 
          onClick={handleMainLogin}
          disabled={!phone || (!isPasswordMode ? !code : !password)}
          className="rounded-full !bg-[#4338CA] active:!bg-[#3730A3] h-12 text-[16px]"
        >
          登 录
        </Button> 

      </div>

      {/* Agreement - Fixed at Bottom */}
      {!isKeyboardOpen && (
        <div className="fixed left-0 right-0 flex items-center justify-center z-30" style={{ bottom: 'max(24px, env(safe-area-inset-bottom, 24px))' }}>
           <label className="flex items-center space-x-2 text-[12px] text-[#8C93A3] cursor-pointer">
              <div className="relative flex items-center justify-center w-[15px] h-[15px] rounded-full border border-[#4338CA]">
                <input 
                  type="checkbox" 
                  className="appearance-none absolute inset-0 w-full h-full opacity-0 cursor-pointer peer z-10"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                />
                <div className={`absolute pointer-events-none rounded-full transition-transform ${agreed ? 'w-[9px] h-[9px] bg-[#4338CA] scale-100' : 'w-[9px] h-[9px] bg-transparent scale-0'}`} />
              </div>
              <span>
                我已阅读并同意 
                <span 
                  className="text-[#4338CA] mx-1 active:opacity-70"
                  onClick={(e) => { e.preventDefault(); openLegalView('AGREEMENT'); }}
                >
                  用户协议
                </span>
                和
                <span 
                  className="text-[#4338CA] mx-1 active:opacity-70"
                  onClick={(e) => { e.preventDefault(); openLegalView('PRIVACY'); }}
                >
                  隐私政策
                </span>
              </span>
           </label>
        </div>
      )}

      {/* Agreement Confirmation Modal */}
      {showAgreementModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-8 bg-black/40 backdrop-blur-[2px]">
          <div className="bg-white w-full max-w-[320px] rounded-2xl p-6 flex flex-col items-center animate-[scale_0.2s_ease-out]">
            <h3 className="text-lg font-bold text-slate-900 mb-4">账号使用协议及隐私保护</h3>
            <p className="text-[14px] text-slate-600 leading-relaxed text-center mb-6">
              为保障你的合法权益，请阅读并同意
              <span 
                className="text-indigo-600 cursor-pointer mx-1"
                onClick={() => { 
                  setShowAgreementModal(false); 
                  setReturnToModal(true); 
                  openLegalView('AGREEMENT'); 
                }}
              >
                账号使用协议
              </span>
              和
              <span 
                className="text-indigo-600 cursor-pointer mx-1"
                onClick={() => { 
                  setShowAgreementModal(false); 
                  setReturnToModal(true); 
                  openLegalView('PRIVACY'); 
                }}
              >
                隐私政策
              </span>
              ，我们将严格保护你的个人信息安全。
            </p>
            
            <div className="w-full space-y-3">
              <Button 
                block 
                className="!bg-[#4337F1] !rounded-full !h-11 !text-[16px] shadow-lg shadow-indigo-500/30"
                onClick={handleAgreementConfirm}
              >
                同意并继续
              </Button>
              <Button 
                block 
                variant="secondary"
                className="!bg-gray-100 !border-0 !text-slate-500 !rounded-full !h-11 !text-[16px]"
                onClick={() => setShowAgreementModal(false)}
              >
                不同意
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default LoginPage;