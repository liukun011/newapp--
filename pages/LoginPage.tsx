import React, { useState, useEffect } from 'react';
import { ArrowLeft, Edit2 } from 'lucide-react';
import Input from '../components/Input';
import Button from '../components/Button';
import { LOGIN_SLIDES } from '../constants';
import { authService } from '../services/authService';
import { Toast } from 'react-vant';

interface LoginPageProps {
  onLogin: () => void;
}

type ViewState = 'LANDING' | 'SMS' | 'PASSWORD';

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const basePath = import.meta.env.BASE_URL || '/';
  const [viewState, setViewState] = useState<ViewState>('LANDING');
  const [currentSlide, setCurrentSlide] = useState(0);
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [countdown, setCountdown] = useState(0);

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

  // Landing Page View (Carousel + Bottom Sheet)
  if (viewState === 'LANDING') {
    const slide = LOGIN_SLIDES[currentSlide];
    
    return (
      <div className="min-h-screen flex flex-col relative overflow-hidden">
         {/* Top Carousel Area */}
         <div className="flex-1 flex flex-col items-center justify-center px-6 pt-8 text-center" style={{ paddingBottom: '26rem' }}>
           {/* Text Content */}
           <div className="mb-8 mt-0 min-h-[120px] flex flex-col justify-center">
              <h2 className="text-2xl font-bold text-[#4E3EF8] mb-4 leading-snug">
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
                  className={`h-2 rounded-full transition-all duration-300 ${idx === currentSlide ? 'w-6 bg-[#4E3EF8]' : 'w-2 bg-indigo-200'}`}
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
              onClick={() => setViewState('SMS')}
            >
              <Edit2 size={16} />
              <span>短信验证登录</span>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="space-y-6">
            <Button 
              block 
              size="large" 
              onClick={async () => {
                if (!agreed) {
                  Toast.info('请先阅读并同意用户协议和隐私政策');
                  return;
                }
                // try {
                //   const res = await authService.login('13278852398', 'Jwx1998...');
                //   if (res.successful && res.data) {
                //     localStorage.setItem('zov-user-token', res.data.accessToken);
                //     localStorage.setItem('zov-userinfo', JSON.stringify({ userId: res.data.userId }));
                //     onLogin();
                //   } else {
                //     Toast.fail(res.message || '登录失败');
                //   }
                // } catch (error) {
                //   console.error('Login error:', error);
                // }
                Toast.fail('功能暂未放开！');
              }} 
              className="shadow-xl shadow-indigo-500/20"
            >
              本机号码一键登录
            </Button>
            
            <Button 
              block 
              size="large" 
              variant="secondary"
              onClick={() => setViewState('SMS')}
              className="border-slate-200 text-slate-600 font-normal"
            >
              验证码登录
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
                <span className="text-indigo-600 mx-1">用户协议</span>
                和
                <span className="text-indigo-600 mx-1">隐私政策</span>
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
        {isPasswordMode && (
           <button className="text-sm text-slate-500 hover:text-indigo-600">
             忘记密码
           </button>
        )}
      </div>

      {/* Main Action Button */}
      <Button 
        block 
        size="large" 
        onClick={async () => {
          if (!agreed) {
            Toast.info('请先阅读并同意用户协议和隐私政策');
            return;
          }
          if (isPasswordMode) {
            try {
              const res = await authService.login(phone, password);
              if (res.successful && res.data) {
                localStorage.setItem('zov-user-token', res.data.accessToken);
                localStorage.setItem('zov-userinfo', JSON.stringify({ userId: res.data.userId }));
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
                 localStorage.setItem('zov-userinfo', JSON.stringify({ userId: res.data.userId }));
                 onLogin();
               } else {
                 Toast.fail(res.message || '登录失败');
               }
             } catch (error) {
               console.error('Login error:', error);
             }
          }
        }}
        disabled={!phone || (isPasswordMode ? !password : !code)}
        className="shadow-xl shadow-indigo-500/20"
      >
        登录
      </Button>

      {/* Bottom Agreement */}
      <div className="mt-auto mb-4 flex items-center justify-center">
         <label className="flex items-center space-x-2 text-xs text-gray-400 cursor-pointer">
            <input 
              type="checkbox" 
              className="accent-indigo-600 w-3.5 h-3.5 rounded-full"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
            />
            <span>我已阅读并同意 <span className="text-indigo-600">用户协议</span> 和 <span className="text-indigo-600">隐私政策</span></span>
         </label>
      </div>

    </div>
  );
};

export default LoginPage;