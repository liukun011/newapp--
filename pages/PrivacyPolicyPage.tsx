import React from 'react';
import { ChevronLeft } from 'lucide-react';

interface PrivacyPolicyPageProps {
  onBack: () => void;
}

const PrivacyPolicyPage: React.FC<PrivacyPolicyPageProps> = ({ onBack }) => {
  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center px-4 py-3 border-b border-gray-100 flex-shrink-0 sticky top-0 bg-white z-10">
        <button 
          onClick={onBack}
          className="p-2 -ml-2 hover:bg-gray-50 rounded-full transition-colors active:scale-95"
        >
          <ChevronLeft size={24} className="text-gray-700" />
        </button>
        <h1 className="flex-1 text-center text-lg font-bold text-gray-800 mr-8">隐私政策</h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-6 text-slate-800 pb-10">
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
};

export default PrivacyPolicyPage;
