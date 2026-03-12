import React from 'react';
import StockLocationPanel from '@/components/estoque/StockLocationPanel.jsx';

export default function EstoqueCD() {
  return (
    <StockLocationPanel
      location="CD"
      title="CD — Central de Distribuição"
      description="Recebimento de matérias-primas de fornecedores e movimentação para PCP."
    />
  );
}
