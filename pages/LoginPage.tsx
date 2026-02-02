import React, { useState, useEffect } from 'react';
import { useThrottleFn } from '../hooks/useThrottleFn';
import { ArrowLeft, Edit2 } from 'lucide-react';
import Input from '../components/Input';
import Button from '../components/Button';
import { LOGIN_SLIDES } from '../constants';

import { authService } from '../services/authService';
import { Toast } from 'react-vant';

interface LoginPageProps {
  onLogin: () => void;
}

type ViewState = 'LANDING' | 'SMS' | 'PASSWORD' | 'AGREEMENT' | 'PRIVACY';



const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const basePath = import.meta.env.BASE_URL || '/';
  const [viewState, setViewState] = useState<ViewState>('LANDING');
  const [currentSlide, setCurrentSlide] = useState(0);
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [pageLoading, setPageLoading] = useState(true);
  const [showAgreementModal, setShowAgreementModal] = useState(false);
  const [previousViewState, setPreviousViewState] = useState<ViewState | null>(null);
  const [returnToModal, setReturnToModal] = useState(false);

  // Helper to enter agreement/privacy view
  const openLegalView = (target: 'AGREEMENT' | 'PRIVACY') => {
    setPreviousViewState(viewState);
    setViewState(target);
  };

  // Perform actual login logic
  const performLogin = async () => {
    if (isPasswordMode) {
      try {
        const res = await authService.login(phone, password);
        if (res.successful && res.data) {
          localStorage.setItem('zov-user-token', res.data.accessToken);
          localStorage.setItem('zov-user-info', JSON.stringify({ userId: res.data.userId }));
          onLogin();
        } else {
           Toast.fail(res.message || '登录失败');
        }
      } catch (error) {
        console.error('Login error:', error);
      }
    } else {
       try {
         const res = await authService.loginWithPhoneCode(phone, code);
         if (res.successful && res.data) {
           localStorage.setItem('zov-user-token', res.data.accessToken);
           localStorage.setItem('zov-user-info', JSON.stringify({ userId: res.data.userId }));
           onLogin();
         } else {
           Toast.fail(res.message || '登录失败');
         }
       } catch (error) {
         console.error('Login error:', error);
       }
    }
  };

  // Moved hooks to top level to comply with Rules of Hooks
  const handleOneClickLogin = useThrottleFn(async () => {
    if (!agreed) {
      setShowAgreementModal(true);
      return;
    }
    Toast.info({ 
      message: '功能开发中，敬请期待！', 
    });
  });

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
    } else if (viewState === 'LANDING') {
       // Should match OneClick login but simpler to just set agreed and let user click again or trigger if we tracked the pending action. 
       // For now, just setting agreed is enough UX improvement, or we can Toast "Please click login again". 
       // Better: Just set agreed. User clicks button again -> Works.
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

  // Auto-play carousel
  useEffect(() => {
    if (viewState !== 'LANDING') return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % LOGIN_SLIDES.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [viewState]);

  // Initial Loading Simulation
  useEffect(() => {
    const timer = setTimeout(() => {
      setPageLoading(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

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
      <div className="min-h-screen bg-white flex flex-col relative">
        <div className="flex items-center px-4 py-3 border-b border-gray-100 bg-white sticky top-0 z-10">
          <button 
            onClick={() => {
              setViewState(previousViewState || 'LANDING');
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
        <div className="flex-1 overflow-y-auto p-6 text-slate-800 pb-10">
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
      <div className="min-h-screen bg-white flex flex-col relative">
        <div className="flex items-center px-4 py-3 border-b border-gray-100 bg-white sticky top-0 z-10">
          <button 
            onClick={() => {
              setViewState(previousViewState || 'LANDING');
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
        <div className="flex-1 overflow-y-auto p-6 text-slate-800 pb-10">
           <div className="mb-6 text-sm text-gray-500">
             <p>本版本发布日期：2026年1月28日</p>
             <p>生效日期：2026年1月28日</p>
           </div>
           
           <h2 className="text-xl font-bold mb-4">1. 引言</h2>
           <p className="text-[15px] leading-relaxed mb-8 text-justify text-slate-600">
             欢迎使用“小狸报告”（简称“本平台”）。作为一款专注于线下访谈与调研场景的智能效率工具，通过“录音转写 + AI 报告生成”双核心能力，帮助业务人员突破时空限制，显著提升现场信息整理与调研报告输出效率，为后续分析与决策提供清晰可靠的信息支持。本平台由北京零壹视界科技有限公司（简称“我们”）提供服务或运营控制。
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
             <li>提供、维护及改进我们的产品和服务；</li>
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

  // Landing Page View (Carousel + Bottom Sheet)
  if (viewState === 'LANDING') {
    const slide = LOGIN_SLIDES[currentSlide];
    
    return (
      <div className="min-h-screen flex flex-col relative overflow-hidden">
         {/* Top Carousel Area */}
         <div className="flex-1 flex flex-col items-center justify-center px-6 pt-8 text-center" style={{ paddingBottom: '26rem' }}>
           {/* Text Content */}
           <div className="mb-8 mt-0 min-h-[120px] flex flex-col justify-center">
              <h2 className="text-2xl font-bold mb-4 leading-snug text-primary">
                {slide.title}
              </h2>
              <p className="text-slate-600 text-sm leading-relaxed px-4">
                {slide.desc}
              </p>
           </div>
           
           {/* Slide Image */}
           <div className="w-96 h-96 flex items-center justify-center" style={{ marginTop: '-66px' }}>
             <img 
               src={`${basePath}assets/login${slide.id}.png`} 
               alt={slide.title}
               className="w-full h-full object-contain"
             />
           </div>

           {/* Carousel Indicators */}
           <div className="flex gap-2 mt-4">
             {LOGIN_SLIDES.map((_, idx) => (
               <div 
                  key={idx}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    idx === currentSlide
                      ? 'w-6 bg-primary'
                      : 'bg-indigo-100'
                  }`}
               />
             ))}
           </div>
        </div>

        {/* Bottom Sheet Card */}
        <div 
          className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[32px] px-8 pt-12 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-20"
          style={{ paddingBottom: '18.4rem' }}
        >
          
          {/* Phone Number Display */}
          <div className="flex items-center justify-center mb-8 gap-3">
            <span className="text-2xl font-bold text-slate-900 tracking-wider">用户登录</span>
            <button 
              className="text-slate-400 hover:text-indigo-600 transition-colors flex justify-center items-center gap-1"
              onClick={() => setViewState('PASSWORD')}
            >
              <Edit2 size={16} />
              <span>密码登录</span>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="space-y-6">
            <Button 
              block 
              size="large" 
              onClick={() => setViewState('SMS')}
              className="shadow-xl shadow-indigo-500/20 bg-primary text-white"
            >
              验证码登录
            </Button>

            <Button 
              block 
              size="large" 
              variant="secondary"
              onClick={handleOneClickLogin}
              className="border-slate-200 text-slate-600 font-normal"
            >
              本机号码一键登录
            </Button>
          </div>
        </div>

        {/* Agreement Checkbox - Fixed at bottom of page */}
        <div className="fixed bottom-6 left-0 right-0 flex items-start justify-center px-8 z-30">
           <label className="flex items-start space-x-2 text-xs text-gray-400 cursor-pointer leading-tight max-w-[280px]">
              <input 
                type="checkbox" 
                className="mt-0.5 accent-indigo-600 w-3.5 h-3.5 rounded-full"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
              />
              <span>
                我已阅读并同意 
                <span 
                  className="text-indigo-600 mx-1 underline underline-offset-2 active:opacity-70"
                  onClick={(e) => { e.preventDefault(); openLegalView('AGREEMENT'); }}
                >
                  用户协议
                </span>
                和
                <span 
                  className="text-indigo-600 mx-1 underline underline-offset-2 active:opacity-70"
                  onClick={(e) => { e.preventDefault(); openLegalView('PRIVACY'); }}
                >
                  隐私政策
                </span>
              </span>
           </label>
        </div>
      </div>
    );
  }

  // Detailed Login Forms (SMS or Password)
  const isPasswordMode = viewState === 'PASSWORD';

  return (
    <div className="min-h-screen bg-white flex flex-col p-6">
      {/* Header */}
      <div className="flex items-center py-2 mb-8">
        <button 
          onClick={() => setViewState('LANDING')}
          className="p-2 -ml-2 hover:bg-slate-50 rounded-full transition-colors"
        >
          <ArrowLeft size={24} className="text-slate-800" />
        </button>
      </div>

      {/* Form Title */}
      <div className="mb-10">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          {isPasswordMode ? '密码登录' : '手机验证码登录'}
        </h1>
        <p className="text-slate-500 text-sm">
          {isPasswordMode 
            ? '请输入您的专属密码，继续访问个人账户' 
            : '未注册的手机号登录成功后自动注册'}
        </p>
      </div>

      {/* Inputs */}
      <div className="space-y-5">
        <Input 
          type="tel" 
          placeholder="请输入手机号" 
          label="+86"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          autoFocus
        />
        
        {isPasswordMode ? (
          <Input 
            type="password" 
            placeholder="请输入密码" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        ) : (
          <Input 
            type="number" 
            placeholder="请输入验证码" 
            value={code}
            onChange={(e) => setCode(e.target.value)}
            suffix={
              <Button 
                variant="text" 
                size="small" 
                disabled={countdown > 0}
                onClick={async () => {
                  if (!phone) {
                    Toast.info('请输入手机号');
                    return;
                  }
                  try {
                    const res = await authService.sendSms(phone);
                    if (res.successful) {
                      setCountdown(60);
                      Toast.success('验证码已发送');
                    } else {
                      Toast.fail(res.message || '发送失败');
                    }
                  } catch (error) {
                    console.error('Send SMS error:', error);
                  }
                }}
                className="font-normal min-w-[5em]"
              >
                {countdown > 0 ? `${countdown}s` : '获取验证码'}
              </Button>
            }
          />
        )}
      </div>

      {/* Auxiliary Links */}
      <div className="flex items-center justify-between mt-4 mb-8">
        <button 
          onClick={() => setViewState(isPasswordMode ? 'SMS' : 'PASSWORD')}
          className="text-sm text-slate-500 hover:text-indigo-600 transition-colors"
        >
          {isPasswordMode ? '验证码登录' : '密码登录'}
        </button>
        {/* {isPasswordMode && (
           <button className="text-sm text-slate-500 hover:text-indigo-600">
             忘记密码
           </button>
        )} */}
      </div>

      {/* Main Action Button */}
      <Button 
        block 
        size="large" 
        onClick={handleMainLogin}
        disabled={!phone || (isPasswordMode ? !password : !code)}
        className="shadow-xl shadow-indigo-500/20"
      >
        登录
      </Button>

      {/* Bottom Agreement */}
      <div className="fixed bottom-6 left-0 right-0 flex items-center justify-center z-10">
         <label className="flex items-center space-x-2 text-xs text-gray-400 cursor-pointer">
            <input 
              type="checkbox" 
              className="accent-indigo-600 w-3.5 h-3.5 rounded-full"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
            />
            <span>
              我已阅读并同意 
               <span 
                className="text-indigo-600 mx-1 underline underline-offset-2 active:opacity-70"
                onClick={(e) => { e.preventDefault(); openLegalView('AGREEMENT'); }}
              >
                用户协议
              </span> 
              和 
              <span 
                className="text-indigo-600 mx-1 underline underline-offset-2 active:opacity-70"
                onClick={(e) => { e.preventDefault(); openLegalView('PRIVACY'); }}
              >
                隐私政策
              </span>
            </span>
         </label>
      </div>

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