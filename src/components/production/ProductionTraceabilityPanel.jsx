import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import { useOperatorFlowStore } from '@/lib/operatorFlowStore';
import { applyExportPreset, exportRowsToExcel, exportRowsToPdf } from '@/lib/flowExport';

const formatNumber = (value) => Number(value || 0).toFixed(2);

export default function ProductionTraceabilityPanel({ machine, order, operatorName }) {
  const { bagTraceability, addBagTraceability } = useOperatorFlowStore();
  const [draft, setDraft] = useState({
    bagCode: '',
    producedKg: '',
    rawMaterialName: '',
    rawMaterialKg: '',
    notes: '',
  });
  const [exportFilters, setExportFilters] = useState({
    preset: 'all',
    startDate: '',
    endDate: '',
    opNumber: '',
    machine: '',
    material: '',
  });

  const scopedRecords = useMemo(
    () =>
      bagTraceability.filter(
        (record) =>
          record.machineId === machine?.id ||
          (record.opNumber && record.opNumber === order?.order_number)
      ),
    [bagTraceability, machine?.id, order?.order_number]
  );

  const nextBagCode = useMemo(() => {
    const base = order?.order_number || 'OP';
    return `${base}-BAG-${String(scopedRecords.length + 1).padStart(3, '0')}`;
  }, [order?.order_number, scopedRecords.length]);

  const handleRegisterBag = () => {
    if (!order?.order_number || !machine?.id) {
      toast.error('Start a machine session and select an OP first.');
      return;
    }

    const producedKg = Number(draft.producedKg || 0);
    const rawMaterialKg = Number(draft.rawMaterialKg || 0);

    if (!Number.isFinite(producedKg) || producedKg <= 0) {
      toast.error('Produced kg must be greater than zero.');
      return;
    }

    if (!draft.rawMaterialName.trim() || !Number.isFinite(rawMaterialKg) || rawMaterialKg <= 0) {
      toast.error('Inform raw material name and consumed kg.');
      return;
    }

    addBagTraceability({
      opNumber: order.order_number,
      machineId: machine.id,
      machineCode: machine.code,
      machineName: machine.name,
      bagCode: draft.bagCode || nextBagCode,
      producedKg,
      rawMaterials: [{ name: draft.rawMaterialName.trim(), kg: rawMaterialKg }],
      notes: draft.notes,
      operatorName,
    });

    toast.success('Bag traceability record saved.');
    setDraft({ bagCode: '', producedKg: '', rawMaterialName: '', rawMaterialKg: '', notes: '' });
  };

  const exportBagTraceability = () => {
    const sourceRows = scopedRecords.map((record) => ({
      bag_code: record.bagCode,
      op_number: record.opNumber,
      machine: record.machineCode || record.machineName || '—',
      produced_kg: formatNumber(record.producedKg),
      raw_material_used: (record.rawMaterials || [])
        .map((material) => `${material.name} (${formatNumber(material.kg)}kg)`)
        .join('; '),
      material: (record.rawMaterials || []).map((material) => material.name).join('; '),
      timestamp: record.createdAt,
    }));

    const rows = applyExportPreset({ ...exportFilters, rows: sourceRows, dateField: 'timestamp' });
    if (!rows.length) return toast.error('No traceability rows found for the selected preset.');

    exportRowsToExcel({ filePrefix: 'bag-traceability', sheetName: 'BagTraceability', rows });
    exportRowsToPdf({
      filePrefix: 'bag-traceability',
      title: 'Bag Traceability Records',
      columns: [
        { key: 'bag_code', label: 'Bag code' },
        { key: 'op_number', label: 'OP number' },
        { key: 'machine', label: 'Machine' },
        { key: 'produced_kg', label: 'Produced kg' },
        { key: 'raw_material_used', label: 'Raw material' },
        { key: 'timestamp', label: 'Timestamp' },
      ],
      rows,
    });

    toast.success('Bag traceability exported (PDF + Excel).');
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-base">Machine traceability by OP and bag</CardTitle>
          <Button size="sm" variant="outline" onClick={exportBagTraceability}>
            <Download className="w-4 h-4 mr-2" /> Export traceability
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Bag code</Label>
            <Input
              placeholder={nextBagCode}
              value={draft.bagCode}
              onChange={(event) => setDraft((prev) => ({ ...prev, bagCode: event.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Produced kg</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={draft.producedKg}
              onChange={(event) => setDraft((prev) => ({ ...prev, producedKg: event.target.value }))}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Raw material</Label>
            <Input
              value={draft.rawMaterialName}
              onChange={(event) => setDraft((prev) => ({ ...prev, rawMaterialName: event.target.value }))}
              placeholder="Ex: PVC Virgem"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Raw material consumed (kg)</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={draft.rawMaterialKg}
              onChange={(event) => setDraft((prev) => ({ ...prev, rawMaterialKg: event.target.value }))}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Notes</Label>
          <Textarea
            value={draft.notes}
            onChange={(event) => setDraft((prev) => ({ ...prev, notes: event.target.value }))}
            placeholder="Any additional production note"
          />
        </div>

        <Button onClick={handleRegisterBag}>Register bag traceability</Button>

        <div className="rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bag</TableHead>
                <TableHead>Machine</TableHead>
                <TableHead>OP</TableHead>
                <TableHead>Produced</TableHead>
                <TableHead>Raw material</TableHead>
                <TableHead>Timestamp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scopedRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No traceability records for this machine/OP yet.
                  </TableCell>
                </TableRow>
              ) : (
                scopedRecords.slice(0, 8).map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">{record.bagCode}</TableCell>
                    <TableCell>{record.machineCode || '—'}</TableCell>
                    <TableCell><Badge variant="secondary">{record.opNumber}</Badge></TableCell>
                    <TableCell>{formatNumber(record.producedKg)} kg</TableCell>
                    <TableCell>
                      {(record.rawMaterials || []).map((material) => `${material.name} (${formatNumber(material.kg)}kg)`).join(', ')}
                    </TableCell>
                    <TableCell>{new Date(record.createdAt).toLocaleString('pt-BR')}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
