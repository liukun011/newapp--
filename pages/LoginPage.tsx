import React, { useState, useEffect } from 'react';
import { ArrowLeft, Edit2 } from 'lucide-react';
import Mascot from '../components/Mascot';
import Input from '../components/Input';
import Button from '../components/Button';
import { LOGIN_SLIDES } from '../constants';

interface LoginPageProps {
  onLogin: () => void;
}

type ViewState = 'LANDING' | 'SMS' | 'PASSWORD';

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [viewState, setViewState] = useState<ViewState>('LANDING');
  const [currentSlide, setCurrentSlide] = useState(0);
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [agreed, setAgreed] = useState(false);

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
        <div className="flex-1 flex flex-col items-center justify-center pb-32 px-6 pt-10 text-center transition-all duration-500">
           {/* Text Content */}
           <div className="mb-8 min-h-[120px] flex flex-col justify-center">
              <h2 className="text-2xl font-bold text-[#4E3EF8] mb-4 leading-snug">
                {slide.title}
              </h2>
              <p className="text-slate-600 text-sm leading-relaxed px-4">
                {slide.desc}
              </p>
           </div>
           
           {/* Mascot */}
           <div className="transform scale-110">
              <Mascot size="large" />
           </div>

           {/* Carousel Indicators */}
           <div className="flex gap-2 mt-8">
             {LOGIN_SLIDES.map((_, idx) => (
               <div 
                  key={idx}
                  className={`h-2 rounded-full transition-all duration-300 ${idx === currentSlide ? 'w-6 bg-[#4E3EF8]' : 'w-2 bg-indigo-200'}`}
               />
             ))}
           </div>
        </div>

        {/* Bottom Sheet Card */}
        <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[32px] p-8 pb-10 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-20">
          
          {/* Phone Number Display */}
          <div className="flex items-center justify-center mb-8 gap-2">
            <span className="text-2xl font-bold text-slate-900 tracking-wider">188****9898</span>
            <button 
              className="text-slate-400 hover:text-indigo-600 transition-colors"
              onClick={() => setViewState('SMS')}
            >
              <Edit2 size={16} />
            </button>
          </div>

          {/* Action Buttons */}
          <div className="space-y-4">
            <Button 
              block 
              size="large" 
              onClick={() => {
                localStorage.setItem('zov-user-token', '779ebb4d-1e15-4cac-9e6a-5ec80bb9e5ff');
                onLogin();
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

          {/* Agreement Checkbox */}
          <div className="mt-6 flex items-start justify-center">
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
                  以及
                  <span className="text-indigo-600 mx-1">中国移动认证服务条款</span>
                </span>
             </label>
          </div>
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
                onClick={() => alert('Code sent!')}
                className="font-normal"
              >
                获取验证码
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
        onClick={() => {
          localStorage.setItem('zov-user-token', '779ebb4d-1e15-4cac-9e6a-5ec80bb9e5ff');
          onLogin();
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