import React from 'react';
import { ChevronDown, Sparkles } from 'lucide-react';
import { NasaImageVariant, NasaLunarImagePlate } from './NasaLunarImagePlate';

interface NasaQuestionDrawerCardProps {
  id?: string;
  questionNumber: string;
  topicTag: string;
  question: string;
  shortAnswerTeaser: string;
  detailedAnswer: string;
  keyTakeawayLabel: string;
  keyTakeawayValue: string;
  imageVariant: NasaImageVariant;
  isOpen: boolean;
  onToggle: () => void;
  openButtonLabel?: string;
  children: React.ReactNode;
}

/**
 * Clean, spacious Question-First Discovery Card.
 * Presents a clear question with NASA imagery and clean topic pills.
 */
export const NasaQuestionDrawerCard: React.FC<NasaQuestionDrawerCardProps> = ({
  id,
  questionNumber,
  topicTag,
  question,
  shortAnswerTeaser,
  detailedAnswer,
  keyTakeawayLabel,
  keyTakeawayValue,
  imageVariant,
  isOpen,
  onToggle,
  openButtonLabel = 'Open Interactive Controls',
  children,
}) => {
  return (
    <div
      id={id}
      className={`nasa-card rounded-3xl overflow-hidden transition-all duration-300 ${
        isOpen ? 'border-sky-400/35 ring-1 ring-sky-400/45' : 'hover:border-sky-400/30'
      }`}
    >
      {/* Top Question Banner with NASA Lunar Imagery */}
      <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
        <div className="lg:col-span-4 relative min-h-[210px]">
          <NasaLunarImagePlate
            variant={imageVariant}
            className="w-full h-full min-h-[210px]"
            overlayTag={topicTag}
          />
        </div>

        <div className="lg:col-span-8 p-6 sm:p-8 lg:p-9 flex flex-col justify-between gap-6 bg-gradient-to-r from-[#0A0F1A] to-[#060911]">
          <div className="space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/12 border border-sky-400/25 text-xs font-medium text-sky-300">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                {questionNumber} · {topicTag}
              </span>
              <span className="text-xs px-3 py-1 rounded-full bg-white/[0.05] border border-white/10 text-lunar-200">
                {keyTakeawayLabel}: <strong className="text-white font-semibold">{keyTakeawayValue}</strong>
              </span>
            </div>

            <button
              type="button"
              onClick={onToggle}
              aria-expanded={isOpen}
              className="w-full text-left group flex items-start justify-between gap-4"
            >
              <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white group-hover:text-sky-200 transition-colors leading-snug tracking-tight">
                {question}
              </h3>
              <span className="nasa-red-circle w-10 h-10 shrink-0 mt-1">
                <ChevronDown
                  className={`w-5 h-5 transition-transform duration-300 ${
                    isOpen ? 'rotate-180' : ''
                  }`}
                />
              </span>
            </button>

            <p className="text-sm sm:text-base text-lunar-300 leading-relaxed max-w-3xl">
              {shortAnswerTeaser}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onToggle}
              aria-expanded={isOpen}
              className={`px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold inline-flex items-center gap-2 transition-all ${
                isOpen
                  ? 'bg-white/10 hover:bg-white/15 text-white border border-white/20'
                  : 'bg-sky-500 hover:bg-sky-400 text-space-950 shadow-[0_8px_24px_rgba(56,189,248,0.28)]'
              }`}
            >
              <span>{isOpen ? 'Hide Interactive Panel' : openButtonLabel}</span>
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-300 ${
                  isOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            <span className="inline-flex items-center gap-1.5 text-xs text-lunar-400">
              <Sparkles className="w-3.5 h-3.5 text-sky-400" />
              {isOpen ? 'Live mission data expanded below' : 'Tap to expand live mission tools'}
            </span>
          </div>
        </div>
      </div>

      {/* Expandable Answer + Interactive Mission Data Drawer */}
      {isOpen && (
        <div className="p-6 sm:p-8 border-t border-white/15 bg-[#04070D]/95 space-y-6">
          {/* Plain-Language Scientific Answer Box */}
          <div className="p-5 rounded-2xl bg-[#0A101C] border-l-4 border-sky-400 space-y-1.5">
            <div className="text-xs font-semibold text-sky-300">
              Quick Summary
            </div>
            <p className="text-sm sm:text-base text-lunar-100 leading-relaxed">
              {detailedAnswer}
            </p>
          </div>

          {/* Live Interactive Component Content */}
          <div>{children}</div>
        </div>
      )}
    </div>
  );
};
