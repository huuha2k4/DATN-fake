import React from 'react';

interface PlaceholderScreenProps {
  title: string;
  description: string;
  icon?: string;
}

export const AdminPlaceholderScreen: React.FC<PlaceholderScreenProps> = ({ title, description }) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-[#e2ece5] dark:border-slate-800 shadow-2xs">
      <div className="size-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-[#07543f] dark:text-emerald-400 grid place-items-center text-2xl font-bold mb-4">
        ⚙
      </div>
      <h2 className="text-xl font-bold text-[#14261e] dark:text-slate-100 mb-2">
        {title}
      </h2>
      <p className="text-xs sm:text-sm text-[#718579] dark:text-slate-400 max-w-md mb-6 leading-relaxed">
        {description}
      </p>
      <span className="text-[11px] font-bold text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40 px-3 py-1 rounded-full">
        Đang sẵn sàng tích hợp các tính năng tiếp theo...
      </span>
    </div>
  );
};

