import type React from 'react';

interface TitleBarProps {
  appName: string;
}

const TitleBar: React.FC<TitleBarProps> = ({ appName }) => {
  return (
    <div className="h-[32px] bg-[#141414] flex items-center justify-center px-2 select-none draggable">
      <div className="flex items-center space-x-2">
        <span className="text-xs text-gray-400">{appName}</span>
      </div>
    </div>
  );
};

export default TitleBar;
