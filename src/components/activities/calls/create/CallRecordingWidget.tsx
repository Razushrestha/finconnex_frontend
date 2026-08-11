import React from "react";

interface CallRecordingWidgetProps {
  durationFormatted: string;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onRewind15?: () => void;
  onForward15?: () => void;
}

export const CallRecordingWidget: React.FC<CallRecordingWidgetProps> = ({
  durationFormatted = "14:22",
  isPlaying,
  onTogglePlay,
  onRewind15,
  onForward15,
}) => {
  return (
    <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
          <span className="text-xs font-bold tracking-wider text-slate-700 uppercase">
            Recording
          </span>
        </div>
        <span className="text-xs font-mono text-slate-500">
          {durationFormatted}
        </span>
      </div>

      {/* Waveform Mock */}
      <div className="flex items-center justify-center space-x-0.5 my-3 h-10 px-2">
        {Array.from({ length: 45 }).map((_, i) => {
          const heights = [12, 24, 8, 32, 16, 28, 6, 20, 36, 14, 22, 10];
          const h = heights[i % heights.length];
          const isPassed = i < 20;
          return (
            <div
              key={i}
              style={{ height: `${h}px` }}
              className={`w-1 rounded-full transition-colors ${
                isPassed ? "bg-blue-600" : "bg-slate-200"
              }`}
            />
          );
        })}
      </div>

      {/* Playback Controls */}
      <div className="flex items-center justify-center space-x-4 pt-2">
        <button
          type="button"
          onClick={onRewind15}
          className="text-slate-400 hover:text-slate-600 text-xs font-medium flex items-center space-x-1"
        >
          <span>↺ 15s</span>
        </button>

        <button
          type="button"
          onClick={onTogglePlay}
          className="h-10 w-10 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md hover:bg-blue-700 transition-colors"
        >
          {isPlaying ? "❚❚" : "▶"}
        </button>

        <button
          type="button"
          onClick={onForward15}
          className="text-slate-400 hover:text-slate-600 text-xs font-medium flex items-center space-x-1"
        >
          <span>15s ↻</span>
        </button>
      </div>
    </div>
  );
};
