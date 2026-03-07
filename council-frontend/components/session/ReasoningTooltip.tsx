interface ReasoningTooltipProps {
  anchorText: string;
  explanation: string;
}

export function ReasoningTooltip({ anchorText, explanation }: ReasoningTooltipProps) {
  return (
    <span className="reasoning-highlight font-medium text-primary">
      {anchorText}
      <span className="material-symbols-outlined text-[14px]">info</span>
      <span className="reasoning-tooltip">
        <span className="font-mono text-[12px] leading-relaxed block text-tooltip-text">
          {explanation}
        </span>
      </span>
    </span>
  );
}
