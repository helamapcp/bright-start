import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useUsersStore } from '@/lib/userStore';
import { useInventoryStore } from '@/lib/inventoryStore';
import { computeScheduledSuggestions, useOperatorFlowStore } from '@/lib/operatorFlowStore';
import { applyExportPreset, exportRowsToExcel, exportRowsToPdf } from '@/lib/flowExport';
import TransferTimeline from '@/components/estoque/TransferTimeline';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { AlertTriangle, Boxes, ClipboardList, Download, PackagePlus, RefreshCw, Route, Workflow } from 'lucide-react';

const toDayKey = (dateLike) => {
  const date = new Date(dateLike);
  date.setHours(0, 0, 0, 0);
  return date.toISOString().slice(0, 10);
};

const formatNumber = (value) => Number(value || 0).toFixed(2);
const normalizeLocation = (value) => String(value || '').trim().toLowerCase();

const buildMaterialOptionValue = (material) => `${material.id}::${material.nome}`;

export default function StockOperatorFlowPanel() {
  const { currentUser } = useUsersStore();
  const { summaryByLocation, receiveMaterial, transferMaterial } = useInventoryStore();
  const {
    transferRequests,
    generatedOps,
    separationOrders,
    openSeparationOrders,
    bagTraceability,
    mixerConfigs,
    addReception,
    createTransferRequest,
    createSeparationOrder,
    updateSeparationLine,
    completeSeparationOrder,
    appendTransferEvent,
    setMixerCapacity,
    getTransferTimeline,
    validateFlowConsistency,
  } = useOperatorFlowStore();

  const [selectedDayKey, setSelectedDayKey] = useState(toDayKey(new Date()));

  const [receptionDraft, setReceptionDraft] = useState({
    materialName: '',
    quantity: '',
    unit: 'kg',
    sackKg: '25',
    notes: '',
  });

  const [manualDraft, setManualDraft] = useState({
    sourceLocation: 'CD',
    destinationLocation: 'PCP',
    materialValue: '',
    quantity: '',
    unit: 'kg',
    sackKg: '25',
    mixer: 'Misturador 1',
    shift: '2',
    notes: '',
  });

  const [selectedTransferId, setSelectedTransferId] = useState('');
  const [mixerDrafts, setMixerDrafts] = useState({});
  const [exportFilters, setExportFilters] = useState({
    preset: 'all',
    startDate: '',
    endDate: '',
    opNumber: '',
    machine: '',
    material: '',
  });

  const { data: formulacoes = [] } = useQuery({
    queryKey: ['formulacoes'],
    queryFn: () => base44.entities.Formulacao.filter({ ativo: true }),
  });

  const { data: materiais = [] } = useQuery({
    queryKey: ['raw-materials-active'],
    queryFn: () => base44.entities.RawMaterial.filter({ ativo: true }),
  });

  const scheduledSuggestions = useMemo(
    () => computeScheduledSuggestions({ formulacoes, materiais, targetDayKey: selectedDayKey }),
    [formulacoes, materiais, selectedDayKey]
  );

  const mixerConfigList = useMemo(
    () => Object.values(mixerConfigs || {}).sort((a, b) => String(a.mixerName).localeCompare(String(b.mixerName))),
    [mixerConfigs]
  );

  const mixerUtilization = useMemo(() => {
    return mixerConfigList.map((config) => {
      const scheduledKg = transferRequests
        .filter((request) => request.destinationLocation === 'PMP' && normalizeLocation(request.mixer) === normalizeLocation(config.mixerName))
        .reduce((sum, request) => sum + Number(request.totalRequiredKg || request.totalKg || 0), 0);

      const capacityKg = Number(config.maxKg || 0);
      const utilizationPct = capacityKg > 0 ? (scheduledKg / capacityKg) * 100 : 0;
      return {
        mixerName: config.mixerName,
        capacityKg,
        scheduledKg,
        utilizationPct,
        remainingKg: capacityKg - scheduledKg,
        overload: scheduledKg > capacityKg && capacityKg > 0,
      };
    });
  }, [mixerConfigList, transferRequests]);

  const consistencyReport = useMemo(
    () => validateFlowConsistency(summaryByLocation),
    [summaryByLocation, validateFlowConsistency, transferRequests, separationOrders, generatedOps, bagTraceability]
  );

  const summaryCards = [
    {
      label: 'Transferências pendentes',
      value: transferRequests.filter((item) => item.status !== 'completed').length,
      icon: Route,
    },
    {
      label: 'Ordens de separação abertas',
      value: openSeparationOrders.length,
      icon: ClipboardList,
    },
    {
      label: 'OPs geradas por misturador',
      value: generatedOps.length,
      icon: Workflow,
    },
    {
      label: 'Bags rastreadas',
      value: bagTraceability.length,
      icon: Boxes,
    },
  ];

  const stockByLocation = [
    { key: 'CD', label: 'CD' },
    { key: 'PCP', label: 'PCP' },
    { key: 'PMP', label: 'PMP' },
  ];

  const handleReception = () => {
    const qty = Number(receptionDraft.quantity || 0);
    const sackKg = Number(receptionDraft.sackKg || 25);
    if (!receptionDraft.materialName.trim()) return toast.error('Select a material for reception.');
    if (!Number.isFinite(qty) || qty <= 0) return toast.error('Enter a valid quantity.');

    const quantityKg = receptionDraft.unit === 'sacks' ? qty * sackKg : qty;
    const quantitySacks = receptionDraft.unit === 'sacks' ? qty : qty / sackKg;

    receiveMaterial({
      location: 'CD',
      itemName: receptionDraft.materialName,
      quantityKg,
      itemType: 'Matéria-prima',
      comment: receptionDraft.notes,
      userName: currentUser?.full_name,
    });

    addReception({
      materialName: receptionDraft.materialName,
      quantityKg,
      quantitySacks,
      sackKg,
      notes: receptionDraft.notes,
      userName: currentUser?.full_name,
    });

    toast.success('Material received in CD and stock updated.');
    setReceptionDraft({ materialName: '', quantity: '', unit: 'kg', sackKg: '25', notes: '' });
  };

  const createScheduledTransfer = (suggestion) => {
    try {
      createTransferRequest({
        kind: 'scheduled',
        sourceLocation: suggestion.sourceLocation,
        destinationLocation: suggestion.destinationLocation,
        dayKey: suggestion.dayKey,
        mixer: suggestion.mixer,
        shift: suggestion.shift,
        batches: suggestion.batches,
        formulationName: suggestion.formulationName,
        materials: suggestion.materials,
        notes: `Programação PMP ${suggestion.dayKey}`,
        userName: currentUser?.full_name,
      });

      toast.success(`Transfer + OP generated for ${suggestion.formulationName}.`);
    } catch (error) {
      toast.error(error.message || 'Could not generate scheduled transfer.');
    }
  };

  const createManualTransfer = () => {
    const qty = Number(manualDraft.quantity || 0);
    const sackKg = Number(manualDraft.sackKg || 25);
    if (!manualDraft.materialValue) return toast.error('Select a material.');
    if (!Number.isFinite(qty) || qty <= 0) return toast.error('Enter a valid transfer quantity.');

    const [, materialNameRaw] = manualDraft.materialValue.split('::');
    const materialName = materialNameRaw || 'Matéria-prima';
    const kg = manualDraft.unit === 'sacks' ? qty * sackKg : qty;
    const newSacks = manualDraft.unit === 'sacks' ? qty : Math.ceil(kg / sackKg);

    try {
      createTransferRequest({
        kind: 'manual',
        sourceLocation: manualDraft.sourceLocation,
        destinationLocation: manualDraft.destinationLocation,
        dayKey: selectedDayKey,
        mixer: manualDraft.mixer,
        shift: manualDraft.shift,
        formulationName: 'Transferência manual',
        materials: [
          {
            materialKey: manualDraft.materialValue.split('::')[0],
            materialName,
            sackKg,
            requiredKg: kg,
            fromLeftoverKg: 0,
            newSacks,
            newlyDrawnKg: newSacks * sackKg,
            expectedPmpLeftoverKg: Number((newSacks * sackKg - kg).toFixed(2)),
          },
        ],
        notes: manualDraft.notes,
        userName: currentUser?.full_name,
      });

      toast.success('Manual transfer request created.');
      setManualDraft((prev) => ({ ...prev, materialValue: '', quantity: '', notes: '' }));
    } catch (error) {
      toast.error(error.message || 'Could not create manual transfer request.');
    }
  };

  const handleOpenSeparation = (requestId) => {
    createSeparationOrder(requestId, currentUser?.full_name);
    toast.success('Separation order generated.');
  };

  const confirmSeparation = (order) => {
    try {
      const request = transferRequests.find((item) => item.id === order.requestId);
      if (!request) throw new Error('Transfer request not found.');

      (order.lines || []).forEach((line) => {
        transferMaterial({
          fromLocation: request.sourceLocation,
          toLocation: request.destinationLocation,
          itemName: line.materialName,
          quantityKg: line.dispatchKg,
          comment: `Ordem de separação ${order.id}`,
          reference: request.opNumber,
          userName: currentUser?.full_name,
        });
      });

      const now = new Date().toISOString();
      appendTransferEvent({
        requestId: request.id,
        action: `Stock transfer posted (${request.sourceLocation} → ${request.destinationLocation})`,
        location: `${request.sourceLocation}→${request.destinationLocation}`,
        userName: currentUser?.full_name,
        timestamp: now,
      });
      appendTransferEvent({
        requestId: request.id,
        action: `Materials received at destination (${request.destinationLocation})`,
        location: request.destinationLocation,
        userName: currentUser?.full_name,
        timestamp: now,
      });

      completeSeparationOrder(order.id, currentUser?.full_name);
      toast.success('Separation completed and stock transfer posted.');
    } catch (error) {
      toast.error(error.message || 'Could not complete separation order.');
    }
  };

  const updateMixerDraft = (mixerName, patch) => {
    setMixerDrafts((prev) => ({
      ...prev,
      [mixerName]: {
        ...(prev[mixerName] || {}),
        ...patch,
      },
    }));
  };

  const saveMixerConfig = (config) => {
    const draft = mixerDrafts[config.mixerName] || {};
    const nextMaxKg = draft.maxKg ?? config.maxKg;
    const nextMode = draft.mode ?? config.mode;

    try {
      setMixerCapacity({
        mixerName: config.mixerName,
        maxKg: nextMaxKg,
        mode: nextMode,
      });
      toast.success(`Mixer ${config.mixerName} capacity updated.`);
    } catch (error) {
      toast.error(error.message || 'Could not update mixer capacity.');
    }
  };

  const handleExportFilterChange = (key, value) => {
    setExportFilters((prev) => ({ ...prev, [key]: value }));
  };

  const getAlertBadgeVariant = (severity) => {
    if (severity === 'error') return 'destructive';
    if (severity === 'warn') return 'secondary';
    return 'outline';
  };

  const openAlertRecord = (alert) => {
    if (alert?.recordType === 'transfer' && alert?.recordId) {
      setSelectedTransferId(alert.recordId);
    }

    if (alert?.anchorId) {
      document.getElementById(alert.anchorId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const buildExportedRows = (rows, dateField) => applyExportPreset({ ...exportFilters, rows, dateField });

  const exportTransferRequests = () => {
    const sourceRows = transferRequests.map((request) => ({
      transfer_id: request.id,
      op_number: request.opNumber,
      source_location: request.sourceLocation,
      destination_location: request.destinationLocation,
      materials: (request.materials || [])
        .map((line) => `${line.materialName} (${formatNumber(line.newlyDrawnKg || line.requiredKg)}kg)`)
        .join('; '),
      quantities_kg: formatNumber(request.totalKg),
      quantities_sacks: request.totalSacks,
      machine: request.mixer,
      status: request.status,
      created_at: request.createdAt,
    }));

    const rows = buildExportedRows(sourceRows, 'created_at');
    if (!rows.length) return toast.error('No transfer rows found for the selected preset.');

    exportRowsToExcel({ filePrefix: 'transfer-requests', sheetName: 'TransferRequests', rows });
    exportRowsToPdf({
      filePrefix: 'transfer-requests',
      title: 'Transfer Requests',
      columns: [
        { key: 'transfer_id', label: 'Transfer ID' },
        { key: 'source_location', label: 'Source' },
        { key: 'destination_location', label: 'Destination' },
        { key: 'materials', label: 'Materials' },
        { key: 'quantities_kg', label: 'Total kg' },
        { key: 'op_number', label: 'OP' },
        { key: 'status', label: 'Status' },
        { key: 'created_at', label: 'Created' },
      ],
      rows,
    });
    toast.success('Transfer Requests exported (PDF + Excel).');
  };

  const exportSeparationOrders = () => {
    const sourceRows = separationOrders.map((order) => {
      const request = transferRequests.find((item) => item.id === order.requestId);
      return {
        order_id: order.id,
        request_id: order.requestId,
        requested_sacks: (order.lines || []).reduce((sum, line) => sum + Number(line.requestedSacks || 0), 0),
        dispatched_sacks: (order.lines || []).reduce((sum, line) => sum + Number(line.dispatchSacks || 0), 0),
        material: (order.lines || []).map((line) => line.materialName).join('; '),
        justifications: (order.lines || [])
          .filter((line) => line.justification)
          .map((line) => `${line.materialName}: ${line.justification}`)
          .join(' | '),
        operator: currentUser?.full_name || 'Frontend Local',
        machine: request?.mixer || '—',
        timestamp: order.completedAt || order.createdAt,
        op_number: request?.opNumber || '—',
      };
    });

    const rows = buildExportedRows(sourceRows, 'timestamp');
    if (!rows.length) return toast.error('No separation order rows found for the selected preset.');

    exportRowsToExcel({ filePrefix: 'separation-orders', sheetName: 'SeparationOrders', rows });
    exportRowsToPdf({
      filePrefix: 'separation-orders',
      title: 'Separation Orders',
      columns: [
        { key: 'order_id', label: 'Order ID' },
        { key: 'requested_sacks', label: 'Requested sacks' },
        { key: 'dispatched_sacks', label: 'Dispatched sacks' },
        { key: 'justifications', label: 'Justifications' },
        { key: 'operator', label: 'Operator' },
        { key: 'timestamp', label: 'Timestamp' },
        { key: 'op_number', label: 'OP' },
      ],
      rows,
    });
    toast.success('Separation Orders exported (PDF + Excel).');
  };

  const exportProductionOps = () => {
    const rows = generatedOps.map((op) => ({
      op_number: op.opNumber,
      mixer: op.mixer,
      shift: op.shift,
      formulation: op.formulationName,
      total_kg: formatNumber(op.totalKg),
      created_at: op.createdAt,
      status: op.status,
    }));

    exportRowsToExcel({ filePrefix: 'production-ops', sheetName: 'ProductionOPs', rows });
    exportRowsToPdf({
      filePrefix: 'production-ops',
      title: 'Production OPs',
      columns: [
        { key: 'op_number', label: 'OP number' },
        { key: 'mixer', label: 'Mixer' },
        { key: 'shift', label: 'Shift' },
        { key: 'formulation', label: 'Formulation' },
        { key: 'total_kg', label: 'Total kg' },
        { key: 'created_at', label: 'Created' },
      ],
      rows,
    });
    toast.success('Production OPs exported (PDF + Excel).');
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label}>
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">{card.label}</p>
                  <p className="text-2xl font-semibold">{card.value}</p>
                </div>
                <div className="w-10 h-10 rounded-md border border-border bg-muted flex items-center justify-center">
                  <Icon className="w-5 h-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">End-to-end flow validation</CardTitle>
          <CardDescription>Checks conversion, leftovers, stock balances, and OP/bag traceability links.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            {consistencyReport.ok ? (
              <Badge variant="secondary">Flow consistent</Badge>
            ) : (
              <Badge variant="destructive" className="flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Issues found</Badge>
            )}
            <span className="text-muted-foreground">{new Date(consistencyReport.checkedAt).toLocaleString('pt-BR')}</span>
          </div>
          {!consistencyReport.ok && (
            <div className="rounded-md border border-border bg-muted p-3 text-xs space-y-1">
              {consistencyReport.issues.map((issue) => (
                <p key={issue} className="text-muted-foreground">• {issue}</p>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Mixer capacity rules (PMP)</CardTitle>
          <CardDescription>Requests PCP → PMP are blocked if OP load exceeds configured capacity.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {mixerConfigList.map((config) => {
            const draft = mixerDrafts[config.mixerName] || {};
            const maxKg = draft.maxKg ?? config.maxKg;
            const mode = draft.mode ?? config.mode;

            return (
              <div key={config.mixerName} className="grid grid-cols-1 md:grid-cols-4 gap-3 rounded-md border border-border p-3">
                <div>
                  <Label>Mixer</Label>
                  <Input value={config.mixerName} readOnly />
                </div>
                <div>
                  <Label>Max capacity (kg)</Label>
                  <Input
                    type="number"
                    min="1"
                    step="0.01"
                    value={maxKg}
                    onChange={(event) => updateMixerDraft(config.mixerName, { maxKg: event.target.value })}
                  />
                </div>
                <div>
                  <Label>Rule mode</Label>
                  <Select value={mode} onValueChange={(value) => updateMixerDraft(config.mixerName, { mode: value })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="operation">Per operation</SelectItem>
                      <SelectItem value="batch">Per batch</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button variant="outline" className="w-full" onClick={() => saveMixerConfig(config)}>
                    Save rule
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Stock snapshot by location</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {stockByLocation.map((location) => (
            <div key={location.key} className="rounded-lg border border-border p-3">
              <p className="text-sm text-muted-foreground">{location.label}</p>
              <p className="text-lg font-semibold">{formatNumber(summaryByLocation[location.key]?.totalQuantity)} kg</p>
              <p className="text-xs text-muted-foreground">{summaryByLocation[location.key]?.totalItems || 0} itens</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Material reception (CD arrival)</CardTitle>
            <CardDescription>Register incoming material in kg or sacks with automatic conversion.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label>Material</Label>
              <Select
                value={receptionDraft.materialName}
                onValueChange={(value) => setReceptionDraft((prev) => ({ ...prev, materialName: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select material" />
                </SelectTrigger>
                <SelectContent>
                  {materiais.map((material) => (
                    <SelectItem key={material.id} value={material.nome || material.codigo}>
                      {material.codigo} • {material.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5 col-span-2">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={receptionDraft.quantity}
                  onChange={(event) => setReceptionDraft((prev) => ({ ...prev, quantity: event.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Unit</Label>
                <Select value={receptionDraft.unit} onValueChange={(value) => setReceptionDraft((prev) => ({ ...prev, unit: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kg">kg</SelectItem>
                    <SelectItem value="sacks">sacks</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Sack weight (kg)</Label>
              <Input
                type="number"
                min="1"
                step="0.01"
                value={receptionDraft.sackKg}
                onChange={(event) => setReceptionDraft((prev) => ({ ...prev, sackKg: event.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea
                value={receptionDraft.notes}
                onChange={(event) => setReceptionDraft((prev) => ({ ...prev, notes: event.target.value }))}
                placeholder="Supplier, invoice, or receiving notes"
              />
            </div>

            <Button className="w-full" onClick={handleReception}>
              <PackagePlus className="w-4 h-4 mr-2" /> Register reception
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Manual transfer request</CardTitle>
            <CardDescription>Create CD → PCP or PCP → PMP requests with unit-to-kg conversion.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>From</Label>
                <Select value={manualDraft.sourceLocation} onValueChange={(value) => setManualDraft((prev) => ({ ...prev, sourceLocation: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CD">CD</SelectItem>
                    <SelectItem value="PCP">PCP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>To</Label>
                <Select value={manualDraft.destinationLocation} onValueChange={(value) => setManualDraft((prev) => ({ ...prev, destinationLocation: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PCP">PCP</SelectItem>
                    <SelectItem value="PMP">PMP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Material</Label>
              <Select value={manualDraft.materialValue} onValueChange={(value) => setManualDraft((prev) => ({ ...prev, materialValue: value }))}>
                <SelectTrigger><SelectValue placeholder="Select material" /></SelectTrigger>
                <SelectContent>
                  {materiais.map((material) => (
                    <SelectItem key={material.id} value={buildMaterialOptionValue(material)}>
                      {material.codigo} • {material.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5 col-span-2">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={manualDraft.quantity}
                  onChange={(event) => setManualDraft((prev) => ({ ...prev, quantity: event.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Unit</Label>
                <Select value={manualDraft.unit} onValueChange={(value) => setManualDraft((prev) => ({ ...prev, unit: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kg">kg</SelectItem>
                    <SelectItem value="sacks">sacks</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Sack kg</Label>
                <Input type="number" value={manualDraft.sackKg} onChange={(event) => setManualDraft((prev) => ({ ...prev, sackKg: event.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Mixer</Label>
                <Input value={manualDraft.mixer} onChange={(event) => setManualDraft((prev) => ({ ...prev, mixer: event.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Shift</Label>
                <Input value={manualDraft.shift} onChange={(event) => setManualDraft((prev) => ({ ...prev, shift: event.target.value }))} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea
                value={manualDraft.notes}
                onChange={(event) => setManualDraft((prev) => ({ ...prev, notes: event.target.value }))}
                placeholder="Manual request reason"
              />
            </div>

            <Button variant="outline" className="w-full" onClick={createManualTransfer}>
              Create manual request + OP
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="text-base">Scheduled PCP → PMP transfers</CardTitle>
              <CardDescription>Pulls automatically from Programação PMP day schedule.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Input type="date" value={selectedDayKey} onChange={(event) => setSelectedDayKey(event.target.value)} className="w-[180px]" />
              <Button variant="outline" size="icon" onClick={() => setSelectedDayKey(toDayKey(new Date()))}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {scheduledSuggestions.length === 0 && (
            <div className="rounded-md border border-border bg-muted p-3 text-sm text-muted-foreground">
              No scheduled PMP batches for this day.
            </div>
          )}

          {scheduledSuggestions.map((suggestion) => (
            <div key={suggestion.id} className="rounded-lg border border-border p-3 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium">{suggestion.formulationName}</p>
                  <p className="text-xs text-muted-foreground">
                    {suggestion.batches} batches • {suggestion.mixer} • Shift {suggestion.shift}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{suggestion.totalSacks} sacks</Badge>
                  <Badge variant="outline">{formatNumber(suggestion.totalKg)} kg</Badge>
                  <Button size="sm" onClick={() => createScheduledTransfer(suggestion)}>Generate request + OP</Button>
                </div>
              </div>

              <div className="space-y-1 text-xs">
                {suggestion.materials.map((material) => (
                  <p key={`${suggestion.id}-${material.materialKey}`} className="text-muted-foreground">
                    {material.materialName}: consume {formatNumber(material.requiredKg)}kg • from PMP balance {formatNumber(material.fromLeftoverKg)}kg •
                    new sacks {material.newSacks} ({formatNumber(material.newlyDrawnKg)}kg) • expected PMP balance {formatNumber(material.expectedPmpLeftoverKg)}kg
                  </p>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle className="text-base">Transfer requests and generated OPs</CardTitle>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={exportTransferRequests}>
                <Download className="w-4 h-4 mr-2" /> Export transfers
              </Button>
              <Button size="sm" variant="outline" onClick={exportProductionOps}>
                <Download className="w-4 h-4 mr-2" /> Export OPs
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>OP</TableHead>
                <TableHead>Flow</TableHead>
                <TableHead>Mixer / Shift</TableHead>
                <TableHead>Materials</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transferRequests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">No transfer requests yet.</TableCell>
                </TableRow>
              ) : (
                transferRequests.flatMap((request) => {
                  const existingOrder = separationOrders.find((order) => order.requestId === request.id);
                  const timelineEvents = getTransferTimeline(request.id);
                  const isOpen = selectedTransferId === request.id;

                  return [
                    <TableRow key={request.id} className="cursor-pointer" onClick={() => setSelectedTransferId(isOpen ? '' : request.id)}>
                      <TableCell className="font-medium">{request.opNumber}</TableCell>
                      <TableCell>{request.sourceLocation} → {request.destinationLocation}</TableCell>
                      <TableCell>{request.mixer} / {request.shift}</TableCell>
                      <TableCell>{request.materials.length} itens • {formatNumber(request.totalKg)} kg</TableCell>
                      <TableCell>
                        <Badge variant={request.status === 'completed' ? 'default' : 'secondary'}>{request.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {!existingOrder && request.status !== 'completed' && (
                          <Button size="sm" variant="outline" onClick={(event) => {
                            event.stopPropagation();
                            handleOpenSeparation(request.id);
                          }}>
                            Generate separation
                          </Button>
                        )}
                        {existingOrder && <Badge variant="outline">SO: {existingOrder.id.slice(0, 6)}</Badge>}
                      </TableCell>
                    </TableRow>,
                    isOpen ? (
                      <TableRow key={`${request.id}-timeline`}>
                        <TableCell colSpan={6} className="bg-muted/50">
                          <div className="space-y-2 p-2">
                            <p className="text-xs font-medium">Transfer timeline</p>
                            <TransferTimeline events={timelineEvents} />
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : null,
                  ];
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <CardTitle className="text-base">Separation orders with justified adjustment</CardTitle>
              <CardDescription>Adjust dispatched sacks per line; changed quantities require justification.</CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={exportSeparationOrders}>
              <Download className="w-4 h-4 mr-2" /> Export separation orders
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {openSeparationOrders.length === 0 && (
            <div className="rounded-md border border-border bg-muted p-3 text-sm text-muted-foreground">
              No open separation orders.
            </div>
          )}

          {openSeparationOrders.map((order) => {
            const request = transferRequests.find((item) => item.id === order.requestId);
            return (
              <div key={order.id} className="rounded-lg border border-border p-3 space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <p className="font-medium">SO {order.id.slice(0, 8)} • {request?.opNumber}</p>
                    <p className="text-xs text-muted-foreground">{request?.sourceLocation} → {request?.destinationLocation} • {request?.mixer}</p>
                  </div>
                  <Button size="sm" onClick={() => confirmSeparation(order)}>Confirm dispatch</Button>
                </div>

                <div className="space-y-2">
                  {(order.lines || []).map((line, index) => {
                    const changed = Number(line.dispatchSacks || 0) !== Number(line.requestedSacks || 0);
                    return (
                      <div key={`${order.id}-${line.materialKey}`} className="rounded-md border border-border p-3 space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-medium">{line.materialName}</p>
                          <Badge variant="outline">requested {line.requestedSacks} sacks ({formatNumber(line.requestedKg)}kg)</Badge>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="space-y-1.5">
                            <Label>Dispatch sacks</Label>
                            <Input
                              type="number"
                              min="0"
                              step="1"
                              value={line.dispatchSacks}
                              onChange={(event) => updateSeparationLine(order.id, index, { dispatchSacks: event.target.value })}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label>Dispatch kg</Label>
                            <Input value={formatNumber(line.dispatchKg)} readOnly />
                          </div>
                          <div className="space-y-1.5">
                            <Label>Status</Label>
                            <Input value={changed ? 'Adjusted' : 'As requested'} readOnly />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <Label>Justification {changed ? '*' : '(optional)'}</Label>
                          <Textarea
                            value={line.justification || ''}
                            onChange={(event) => updateSeparationLine(order.id, index, { justification: event.target.value })}
                            placeholder="Required when dispatched sacks differ from requested"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
