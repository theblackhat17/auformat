'use client';

import type { WizardStepDef } from '@/lib/types';

interface Props {
  steps: WizardStepDef[];
  currentStep: number;
  maxReachedStep: number;
  onGoto: (step: number) => void;
  onNext: () => void;
  onPrev: () => void;
  onSave?: () => void;
  isSaving?: boolean;
  isLastStep: boolean;
}

export function WizardNavigation({ steps, currentStep, maxReachedStep, onGoto, onNext, onPrev, onSave, isSaving, isLastStep }: Props) {
  return (
    <div className="flex flex-col gap-4">
      {/* Step indicator */}
      <div className="flex items-center gap-1 px-4 pt-4 overflow-x-auto">
        {steps.map((step, i) => {
          const isPast = i < currentStep;
          const isCurrent = i === currentStep;
          const isReachable = i <= maxReachedStep;
          return (
            <button
              key={step.key}
              onClick={() => isReachable && onGoto(i)}
              disabled={!isReachable}
              className={`flex items-center gap-1.5 text-xs whitespace-nowrap px-2 py-1.5 rounded-full transition-colors ${
                isCurrent
                  ? 'bg-vert-foret text-white font-semibold'
                  : isPast
                  ? 'bg-vert-foret/10 text-vert-foret cursor-pointer hover:bg-vert-foret/20'
                  : isReachable
                  ? 'bg-gray-100 text-gray-600 cursor-pointer hover:bg-gray-200'
                  : 'bg-gray-50 text-gray-300 cursor-not-allowed'
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                isCurrent ? 'bg-white text-vert-foret' : isPast ? 'bg-vert-foret text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                {isPast ? '✓' : i + 1}
              </span>
              <span className="hidden lg:inline">{step.label}</span>
            </button>
          );
        })}
      </div>

      {/* Bottom navigation */}
      <div className="flex items-center justify-between px-4 pb-4 border-t border-gray-100 pt-3 mt-auto">
        <button
          onClick={onPrev}
          disabled={currentStep === 0}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          ← Precedent
        </button>
        {isLastStep ? (
          <button
            onClick={onSave}
            disabled={isSaving}
            className="px-6 py-2.5 bg-vert-foret text-white text-sm font-semibold rounded-lg hover:bg-vert-foret-dark disabled:opacity-50 transition-colors"
          >
            {isSaving ? 'Sauvegarde...' : 'Sauvegarder le projet'}
          </button>
        ) : (
          <button
            onClick={onNext}
            className="px-6 py-2.5 bg-vert-foret text-white text-sm font-semibold rounded-lg hover:bg-vert-foret-dark transition-colors"
          >
            Suivant →
          </button>
        )}
      </div>
    </div>
  );
}
