'use client';

import { useState } from 'react';
import { ChevronDown, Info } from 'lucide-react';

type ModelGuideInlineProps = {
  title: string;
  summary: string;
  bestFor: string;
  workflow: string;
  badgeLabel: string;
  bestForLabel: string;
  workflowLabel: string;
  expandLabel: string;
  collapseLabel: string;
  accentClassName: string;
  defaultExpanded?: boolean;
  collapsible?: boolean;
  showTitle?: boolean;
};

export default function ModelGuideInline({
  title,
  summary,
  bestFor,
  workflow,
  badgeLabel,
  bestForLabel,
  workflowLabel,
  expandLabel,
  collapseLabel,
  accentClassName,
  defaultExpanded = false,
  collapsible = true,
  showTitle = true,
}: ModelGuideInlineProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className={`rounded-[1.25rem] border bg-[linear-gradient(180deg,rgba(12,16,22,0.94),rgba(8,10,14,0.9))] p-3.5 shadow-[0_18px_44px_rgba(0,0,0,0.22)] backdrop-blur-xl ${accentClassName}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/85">
              <Info className="h-3 w-3" />
              {badgeLabel}
            </span>
            {showTitle ? <span className="text-xs font-semibold text-white">{title}</span> : null}
          </div>
          <p className={`text-sm leading-relaxed text-zinc-100 ${showTitle ? 'mt-2' : 'mt-2.5'}`}>{summary}</p>
        </div>

        {collapsible ? (
          <button
            type="button"
            onClick={() => setExpanded((current) => !current)}
            className="inline-flex shrink-0 items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-medium text-zinc-300 transition-colors hover:bg-white/[0.07] hover:text-white"
          >
            {expanded ? collapseLabel : expandLabel}
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>
        ) : null}
      </div>

      {expanded ? (
        <div className="mt-3 space-y-2 border-t border-white/8 pt-3 text-xs leading-relaxed text-zinc-400">
          <p><span className="text-zinc-200">{bestForLabel}:</span> {bestFor}</p>
          <p><span className="text-zinc-200">{workflowLabel}:</span> {workflow}</p>
        </div>
      ) : null}
    </div>
  );
}
