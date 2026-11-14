import React from 'react';
import { Flame } from 'lucide-react';

interface LoadingSpinnerProps {
  message?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = "Processing satellite observations..."
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 space-y-4">
      <div className="relative flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-2 border-orange-500/20 border-t-orange-500 animate-spin" />
        <Flame className="w-5 h-5 text-amber-500 absolute animate-pulse" />
      </div>
      <p className="text-xs text-slate-400 font-mono tracking-wide animate-pulse">{message}</p>
    </div>
  );
};
