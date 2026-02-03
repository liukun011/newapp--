import React from 'react';
import { ChevronLeft } from 'lucide-react';

interface UserAgreementPageProps {
  onBack: () => void;
}

const UserAgreementPage: React.FC<UserAgreementPageProps> = ({ onBack }) => {
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
        <h1 className="flex-1 text-center text-lg font-bold text-gray-800 mr-8">用户协议</h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-6 text-slate-800 pb-10">
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
};

export default UserAgreementPage;
