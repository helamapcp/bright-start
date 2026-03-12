import React from 'react';
import StockLocationPanel from '@/components/estoque/StockLocationPanel.jsx';

export default function EstoquePCP() {
  return (
    <StockLocationPanel
      location="PCP"
      title="PCP"
      description="Controle de matérias-primas transferidas do CD para planejamento de formulações."
    />
  );
}
