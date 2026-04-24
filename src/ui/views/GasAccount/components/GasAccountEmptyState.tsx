import React from 'react';
import { GasAccountBenefitsCard } from './GasAccountBenefitsCard';

export const GasAccountEmptyState: React.FC = () => {
  return (
    <div className="flex min-h-full flex-col">
      <GasAccountBenefitsCard />
    </div>
  );
};
