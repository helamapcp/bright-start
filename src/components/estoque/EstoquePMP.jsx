import React from 'react';
import StockLocationPanel from '@/components/estoque/StockLocationPanel.jsx';

export default function EstoquePMP() {
  return (
    <StockLocationPanel
      location="PMP"
      title="PMP"
      description="Controle de consumo por formulação, sobras de lote e composto produzido."
    />
  );
}
