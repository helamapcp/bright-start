import React from 'react';
import StockLocationPanel from '@/components/estoque/StockLocationPanel.jsx';

export default function EstoqueFabrica() {
  return (
    <StockLocationPanel
      location="FÁBRICA"
      title="Fábrica"
      description="Acompanhamento de composto liberado para produção e produtos acabados reportados por OP."
    />
  );
}
