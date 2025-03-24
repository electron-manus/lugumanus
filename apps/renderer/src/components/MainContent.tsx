import type React from 'react';

const MainContent: React.FC = () => {
  return (
    <div className="flex-1 bg-[#1f1f1f] p-4 overflow-auto">
      {/* 这里可以放置应用的主要内容 */}
      <div className="text-white">
        <h1 className="text-xl font-bold mb-4">欢迎使用麓咕</h1>
        <p>这里是应用的主要内容区域</p>
      </div>
    </div>
  );
};

export default MainContent;
