'use client';

import { useMemo } from 'react';
import type { WizardState, WizardStepDef, PriceBreakdown, ConfiguratorConfig, ProductType } from '@/lib/types';
import { StepProductType } from './steps/StepProductType';
import { StepMeubleTemplate } from './steps/meuble/StepMeubleTemplate';
import { StepMeubleStructure } from './steps/meuble/StepMeubleStructure';
import { StepMeubleModules } from './steps/meuble/StepMeubleModules';
import { StepMeubleMaterials } from './steps/meuble/StepMeubleMaterials';
import { StepMeubleHardware } from './steps/meuble/StepMeubleHardware';
import { StepMeubleRecap } from './steps/meuble/StepMeubleRecap';
import { StepPlancheDimensions } from './steps/planche/StepPlancheDimensions';
import { StepPlancheMaterials } from './steps/planche/StepPlancheMaterials';
import { StepPlancheEdgesFinish } from './steps/planche/StepPlancheEdgesFinish';
import { StepPlancheRecap } from './steps/planche/StepPlancheRecap';
import { StepCuisineLayout } from './steps/cuisine/StepCuisineLayout';
import { StepCuisineBaseCabinets } from './steps/cuisine/StepCuisineBaseCabinets';
import { StepCuisineWallCabinets } from './steps/cuisine/StepCuisineWallCabinets';
import { StepCuisineCountertop } from './steps/cuisine/StepCuisineCountertop';
import { StepCuisineFacades } from './steps/cuisine/StepCuisineFacades';
import { StepCuisineHardware } from './steps/cuisine/StepCuisineHardware';
import { StepCuisineRecap } from './steps/cuisine/StepCuisineRecap';

interface Props {
  state: WizardState;
  dispatch: React.Dispatch<any>;
  steps: WizardStepDef[];
  price: PriceBreakdown;
}

export function ConfigurateurWizard({ state, dispatch, steps, price }: Props) {
  const { config, currentStep } = state;
  const stepKey = steps[currentStep]?.key;

  const content = useMemo(() => {
    // Step 0 is always product type selection
    if (stepKey === 'type') {
      return <StepProductType config={config} dispatch={dispatch} />;
    }

    switch (config.productType) {
      case 'meuble':
        switch (stepKey) {
          case 'template': return <StepMeubleTemplate config={config} dispatch={dispatch} />;
          case 'structure': return <StepMeubleStructure config={config} dispatch={dispatch} />;
          case 'modules': return <StepMeubleModules config={config} dispatch={dispatch} />;
          case 'materials': return <StepMeubleMaterials config={config} dispatch={dispatch} />;
          case 'hardware': return <StepMeubleHardware config={config} dispatch={dispatch} price={price} />;
          case 'recap': return <StepMeubleRecap config={config} price={price} />;
        }
        break;

      case 'planche':
        switch (stepKey) {
          case 'dimensions': return <StepPlancheDimensions config={config} dispatch={dispatch} />;
          case 'materials': return <StepPlancheMaterials config={config} dispatch={dispatch} />;
          case 'edges': return <StepPlancheEdgesFinish config={config} dispatch={dispatch} />;
          case 'recap': return <StepPlancheRecap config={config} price={price} />;
        }
        break;

      case 'cuisine':
        switch (stepKey) {
          case 'layout': return <StepCuisineLayout config={config} dispatch={dispatch} />;
          case 'base': return <StepCuisineBaseCabinets config={config} dispatch={dispatch} />;
          case 'wall': return <StepCuisineWallCabinets config={config} dispatch={dispatch} />;
          case 'countertop': return <StepCuisineCountertop config={config} dispatch={dispatch} />;
          case 'facades': return <StepCuisineFacades config={config} dispatch={dispatch} />;
          case 'hardware': return <StepCuisineHardware config={config} dispatch={dispatch} price={price} />;
          case 'recap': return <StepCuisineRecap config={config} price={price} />;
        }
        break;
    }

    return <div className="p-6 text-gray-400">Etape inconnue</div>;
  }, [stepKey, config, dispatch, price]);

  return (
    <div className="flex-1 overflow-y-auto">
      {content}
    </div>
  );
}
