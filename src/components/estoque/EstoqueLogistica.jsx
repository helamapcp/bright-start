import React from 'react';
import { Truck } from 'lucide-react';
import StockLocationPanel from '@/components/estoque/StockLocationPanel.jsx';

export default function EstoqueLogistica() {
  return (
    <StockLocationPanel
      location="LOGÍSTICA"
      title="Logística"
      description="Produtos acabados transferidos da fábrica e prontos para faturamento e expedição."
      icon={Truck}
    />
  );
}
