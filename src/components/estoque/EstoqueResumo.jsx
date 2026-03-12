import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BarChart3 } from 'lucide-react';
import { STOCK_LOCATIONS, useInventoryStore } from '@/lib/inventoryStore';

const labels = {
  CD: 'CD',
  PCP: 'PCP',
  PMP: 'PMP',
  'FÁBRICA': 'Fábrica',
  'LOGÍSTICA': 'Logística',
};

const tabByLocation = {
  CD: 'cd',
  PCP: 'pcp',
  PMP: 'pmp',
  'FÁBRICA': 'fabrica',
  'LOGÍSTICA': 'logistica',
};

export default function EstoqueResumo({ onNavigate }) {
  const { summaryByLocation } = useInventoryStore();

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            <h2 className="font-semibold">Resumo Geral</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Fluxo completo de estoque: CD → PCP → PMP → Fábrica → Logística.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
            {STOCK_LOCATIONS.map((location) => {
              const summary = summaryByLocation[location] || { totalItems: 0, totalQuantity: 0 };
              return (
                <div key={location} className="rounded-md border p-3 space-y-1">
                  <p className="text-sm font-medium">{labels[location]}</p>
                  <Badge variant="secondary">{summary.totalItems} itens</Badge>
                  <p className="text-sm">Qtd total: {summary.totalQuantity.toFixed(2)}</p>
                </div>
              );
            })}
          </div>
          <div className="flex gap-2 flex-wrap">
            {STOCK_LOCATIONS.map((location) => (
              <Button
                key={location}
                variant="outline"
                size="sm"
                onClick={() => onNavigate?.(tabByLocation[location])}
              >
                Ir para {labels[location]}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
