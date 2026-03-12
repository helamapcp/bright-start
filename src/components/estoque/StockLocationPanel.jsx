import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { useInventoryStore } from '@/lib/inventoryStore';

const formatDateTime = (value) => (value ? new Date(value).toLocaleString('pt-BR') : '—');

export default function StockLocationPanel({ location, title, description }) {
  const { getItemsByLocation, summaryByLocation, adjustItemQuantity } = useInventoryStore();
  const locationItems = getItemsByLocation(location);
  const summary = summaryByLocation[location] || { totalItems: 0, totalQuantity: 0 };

  const [selectedItemId, setSelectedItemId] = useState('');
  const [adjustmentQty, setAdjustmentQty] = useState('');
  const [comment, setComment] = useState('');

  const selectedItem = useMemo(
    () => locationItems.find((item) => item.id === selectedItemId) || locationItems[0] || null,
    [locationItems, selectedItemId]
  );

  const effectiveSelectedItemId = selectedItemId || selectedItem?.id || '';

  const onConfirmAdjustment = () => {
    if (!effectiveSelectedItemId) {
      toast.error('Selecione um item para ajustar.');
      return;
    }

    try {
      adjustItemQuantity({
        location,
        itemId: effectiveSelectedItemId,
        adjustmentQty,
        comment,
      });
      setAdjustmentQty('');
      setComment('');
      toast.success('Ajuste aplicado no estoque local.');
    } catch (error) {
      toast.error(error.message || 'Não foi possível aplicar o ajuste.');
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{title}</CardTitle>
          <p className="text-sm text-muted-foreground">{description}</p>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-md border p-3">
            <p className="text-sm text-muted-foreground">Itens no local</p>
            <p className="text-2xl font-semibold">{summary.totalItems}</p>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-sm text-muted-foreground">Quantidade total</p>
            <p className="text-2xl font-semibold">{summary.totalQuantity.toFixed(2)}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Estoque atual</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Quantidade</TableHead>
                <TableHead>Unidade</TableHead>
                <TableHead>Atualizado em</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {locationItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Nenhum item cadastrado para este local.
                  </TableCell>
                </TableRow>
              ) : (
                locationItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.item_name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{item.item_type}</Badge>
                    </TableCell>
                    <TableCell>{Number(item.quantity || 0).toFixed(2)}</TableCell>
                    <TableCell>{item.unit}</TableCell>
                    <TableCell>{formatDateTime(item.updated_at)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Ajuste manual</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label>Item</Label>
            <Select value={effectiveSelectedItemId} onValueChange={setSelectedItemId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o item" />
              </SelectTrigger>
              <SelectContent>
                {locationItems.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.item_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Quantidade de ajuste (+ entrada / - saída)</Label>
            <Input
              type="number"
              step="0.01"
              value={adjustmentQty}
              onChange={(event) => setAdjustmentQty(event.target.value)}
              placeholder="Ex: 25 ou -10"
            />
          </div>
          <div className="space-y-1">
            <Label>Comentário obrigatório</Label>
            <Textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Informe o motivo do ajuste manual"
            />
          </div>
          <Button onClick={onConfirmAdjustment} disabled={!locationItems.length}>
            Confirmar ajuste
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
