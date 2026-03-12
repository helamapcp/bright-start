import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { useInventoryStore, STOCK_LOCATIONS } from '@/lib/inventoryStore';
import { appendSystemLog } from '@/lib/systemLog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  AlertTriangle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FlaskConical,
  Pencil,
  Plus,
  Send,
  Trash2,
  Factory,
} from 'lucide-react';
import { toast } from 'sonner';

const PMP_SCHEDULING_STORAGE_KEY = 'frontend-pmp-scheduling-v1';
const PMP_SHIFT_STORAGE_KEY = 'frontend-pmp-shifts-v1';
const LEGACY_HANDOFF_KEY = 'frontend-formulation-plan-handoff-v1';
const DEFAULT_SHIFT_OPTIONS = ['1', '2'];
const DEFAULT_MIXERS = ['Misturador 1', 'Misturador 2', 'Misturador 3'];

const makeId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `pmp-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const parseSafe = (raw, fallback) => {
  try {
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
};

const normalize = (value) => String(value || '').trim().toLowerCase();

const startOfDay = (dateLike) => {
  const d = new Date(dateLike);
  d.setHours(0, 0, 0, 0);
  return d;
};

const toDayKey = (dateLike) => startOfDay(dateLike).toISOString().slice(0, 10);

const fromDayKey = (dayKey) => {
  const [year, month, day] = String(dayKey).split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
};

const formatDate = (dateLike) => startOfDay(dateLike).toLocaleDateString('pt-BR');

const startOfWeek = (dateLike) => {
  const base = startOfDay(dateLike);
  const day = (base.getDay() + 6) % 7;
  base.setDate(base.getDate() - day);
  return base;
};

const buildWeekDays = (dateLike) => {
  const start = startOfWeek(dateLike);
  return Array.from({ length: 7 }).map((_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return {
      key: toDayKey(date),
      iso: date.toISOString(),
      label: date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }),
      shortLabel: date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    };
  });
};

const readPlanning = () => {
  if (typeof window === 'undefined') return {};
  const parsed = parseSafe(window.localStorage.getItem(PMP_SCHEDULING_STORAGE_KEY), {});
  return parsed && typeof parsed === 'object' ? parsed : {};
};

const readShiftOptions = () => {
  if (typeof window === 'undefined') return DEFAULT_SHIFT_OPTIONS;
  const parsed = parseSafe(window.localStorage.getItem(PMP_SHIFT_STORAGE_KEY), DEFAULT_SHIFT_OPTIONS);
  if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_SHIFT_OPTIONS;
  return Array.from(new Set(parsed.map((value) => String(value).trim()).filter(Boolean)));
};

const parseIngredientes = (formulacao) => {
  if (!formulacao?.ingredientes) return [];
  const parsed = parseSafe(formulacao.ingredientes, []);
  return Array.isArray(parsed) ? parsed : [];
};

const isNameMatch = (left, right) => {
  const a = normalize(left);
  const b = normalize(right);
  if (!a || !b) return false;
  return a.includes(b) || b.includes(a);
};

const buildRawMaterialLookups = (materiais) => {
  const byId = new Map();
  const byName = new Map();

  materiais.forEach((material) => {
    const sackKg = Number(material.peso_saco_kg || 0) > 0 ? Number(material.peso_saco_kg) : 25;
    const name = String(material.nome || material.codigo || '').trim();
    const meta = {
      id: material.id,
      name,
      sackKg,
    };

    if (material.id) byId.set(material.id, meta);
    if (name) byName.set(normalize(name), meta);
  });

  return { byId, byName };
};

const computeStockAtLocationForMaterial = (items, location, materialName) =>
  items
    .filter((item) => item.location === location && isNameMatch(item.item_name, materialName))
    .reduce((sum, item) => sum + Number(item.quantity || 0), 0);

const initialDraft = (dayKey = toDayKey(new Date())) => ({
  dayKey,
  formulationId: '',
  batches: '1',
  mixer: DEFAULT_MIXERS[0],
  shift: '2',
  sourceLocation: 'PCP',
});

export default function FormulationPlanning() {
  const [planningByDay, setPlanningByDay] = useState(() => readPlanning());
  const [viewMode, setViewMode] = useState('week');
  const [focusDate, setFocusDate] = useState(() => new Date());
  const [selectedDayKey, setSelectedDayKey] = useState(() => toDayKey(new Date()));
  const [shiftOptions, setShiftOptions] = useState(() => readShiftOptions());
  const [newShiftValue, setNewShiftValue] = useState('');
  const [editorState, setEditorState] = useState({
    open: false,
    mode: 'create',
    originalDayKey: null,
    lineId: null,
    draft: initialDraft(),
  });

  const { items: inventoryItems } = useInventoryStore();

  const { data: formulacoes = [] } = useQuery({
    queryKey: ['formulacoes'],
    queryFn: () => base44.entities.Formulacao.filter({ ativo: true }),
  });

  const { data: materiais = [] } = useQuery({
    queryKey: ['raw-materials-active'],
    queryFn: () => base44.entities.RawMaterial.filter({ ativo: true }),
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(PMP_SCHEDULING_STORAGE_KEY, JSON.stringify(planningByDay));
  }, [planningByDay]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(PMP_SHIFT_STORAGE_KEY, JSON.stringify(shiftOptions));
  }, [shiftOptions]);

  const weekDays = useMemo(() => buildWeekDays(focusDate), [focusDate]);

  const formulationMap = useMemo(() => {
    const map = new Map();
    formulacoes.forEach((formulacao) => map.set(formulacao.id, formulacao));
    return map;
  }, [formulacoes]);

  const rawMaterialLookups = useMemo(() => buildRawMaterialLookups(materiais), [materiais]);

  const allEntries = useMemo(() => {
    const flat = Object.entries(planningByDay).flatMap(([dayKey, lines]) =>
      (Array.isArray(lines) ? lines : []).map((line) => ({ ...line, dayKey }))
    );

    return flat.sort((a, b) => {
      if (a.dayKey !== b.dayKey) return a.dayKey.localeCompare(b.dayKey);
      return String(a.createdAt || '').localeCompare(String(b.createdAt || ''));
    });
  }, [planningByDay]);

  const planningCalculations = useMemo(() => {
    const leftoverByMaterial = new Map();
    const detailsByEntry = new Map();
    const materialSummaryByKey = new Map();
    const locationDrawByMaterial = new Map();

    allEntries.forEach((entry) => {
      const formulacao = formulationMap.get(entry.formulationId);
      if (!formulacao) return;

      const ingredientes = parseIngredientes(formulacao);
      const entryRows = [];

      ingredientes.forEach((ingrediente) => {
        const requiredPerBatch = Number(ingrediente.quantidade_kg || 0);
        const batchCount = Number(entry.batches || 0);
        if (!Number.isFinite(requiredPerBatch) || requiredPerBatch <= 0 || !Number.isFinite(batchCount) || batchCount <= 0) return;

        const requiredKg = Number((requiredPerBatch * batchCount).toFixed(2));
        const ingredientName = String(ingrediente.material_nome || '').trim();
        const byId = rawMaterialLookups.byId.get(ingrediente.material_id);
        const byName = rawMaterialLookups.byName.get(normalize(ingredientName));
        const meta = byId || byName || { id: ingredientName, name: ingredientName || 'Matéria-prima', sackKg: 25 };

        const materialKey = String(meta.id || normalize(meta.name));
        const sackKg = Number(meta.sackKg || 25);
        const leftoverBefore = Number(leftoverByMaterial.get(materialKey) || 0);
        const fromLeftover = Number(Math.min(leftoverBefore, requiredKg).toFixed(2));
        const missingKg = Number((requiredKg - fromLeftover).toFixed(2));
        const openedSacks = missingKg > 0 ? Math.ceil(missingKg / sackKg) : 0;
        const drawnKg = Number((openedSacks * sackKg).toFixed(2));
        const leftoverAfter = Number((leftoverBefore + drawnKg - requiredKg).toFixed(2));

        leftoverByMaterial.set(materialKey, leftoverAfter);

        entryRows.push({
          materialKey,
          materialName: meta.name,
          requiredKg,
          sackKg,
          openedSacks,
          drawnKg,
          fromLeftover,
          leftoverBefore,
          leftoverAfter,
          sourceLocation: entry.sourceLocation,
        });

        const currentSummary = materialSummaryByKey.get(materialKey) || {
          materialKey,
          materialName: meta.name,
          sackKg,
          requiredKg: 0,
          openedSacks: 0,
          drawnKg: 0,
          fromLeftoverKg: 0,
          leftoverKg: 0,
        };

        currentSummary.requiredKg = Number((currentSummary.requiredKg + requiredKg).toFixed(2));
        currentSummary.openedSacks += openedSacks;
        currentSummary.drawnKg = Number((currentSummary.drawnKg + drawnKg).toFixed(2));
        currentSummary.fromLeftoverKg = Number((currentSummary.fromLeftoverKg + fromLeftover).toFixed(2));
        currentSummary.leftoverKg = leftoverAfter;
        materialSummaryByKey.set(materialKey, currentSummary);

        const locationKey = `${entry.sourceLocation}::${materialKey}`;
        const locationRow = locationDrawByMaterial.get(locationKey) || {
          key: locationKey,
          location: entry.sourceLocation,
          materialKey,
          materialName: meta.name,
          drawnKg: 0,
        };

        locationRow.drawnKg = Number((locationRow.drawnKg + drawnKg).toFixed(2));
        locationDrawByMaterial.set(locationKey, locationRow);
      });

      detailsByEntry.set(entry.id, entryRows);
    });

    const stockWarnings = Array.from(locationDrawByMaterial.values())
      .map((row) => {
        const availableKg = computeStockAtLocationForMaterial(inventoryItems, row.location, row.materialName);
        const remainingKg = Number((availableKg - row.drawnKg).toFixed(2));
        const isCritical = remainingKg < 0;
        const isWarning = !isCritical && availableKg > 0 && remainingKg <= availableKg * 0.2;

        return {
          ...row,
          availableKg,
          remainingKg,
          isCritical,
          isWarning,
        };
      })
      .filter((row) => row.isCritical || row.isWarning)
      .sort((a, b) => {
        if (a.isCritical !== b.isCritical) return a.isCritical ? -1 : 1;
        return a.remainingKg - b.remainingKg;
      });

    return {
      detailsByEntry,
      materialSummary: Array.from(materialSummaryByKey.values()).sort((a, b) => b.requiredKg - a.requiredKg),
      stockWarnings,
    };
  }, [allEntries, formulationMap, rawMaterialLookups, inventoryItems]);

  const summary = useMemo(() => {
    const totalBatches = allEntries.reduce((sum, entry) => sum + Number(entry.batches || 0), 0);
    const totalCompoundKg = allEntries.reduce((sum, entry) => {
      const formula = formulationMap.get(entry.formulationId);
      return sum + Number(formula?.peso_batelada_kg || 0) * Number(entry.batches || 0);
    }, 0);

    return {
      totalEntries: allEntries.length,
      totalBatches,
      totalCompoundKg,
      warningCount: planningCalculations.stockWarnings.length,
    };
  }, [allEntries, formulationMap, planningCalculations.stockWarnings.length]);

  const dayEntries = useMemo(() => planningByDay[selectedDayKey] || [], [planningByDay, selectedDayKey]);

  const openCreateModal = (dayKey) => {
    setEditorState({
      open: true,
      mode: 'create',
      originalDayKey: dayKey,
      lineId: null,
      draft: initialDraft(dayKey),
    });
  };

  const openEditModal = (line) => {
    setEditorState({
      open: true,
      mode: 'edit',
      originalDayKey: line.dayKey,
      lineId: line.id,
      draft: {
        dayKey: line.dayKey,
        formulationId: line.formulationId,
        batches: String(line.batches || 1),
        mixer: line.mixer || DEFAULT_MIXERS[0],
        shift: String(line.shift || '2'),
        sourceLocation: line.sourceLocation || 'PCP',
      },
    });
  };

  const closeEditor = () => {
    setEditorState((prev) => ({ ...prev, open: false }));
    setNewShiftValue('');
  };

  const updateEditorDraft = (patch) => {
    setEditorState((prev) => ({
      ...prev,
      draft: {
        ...prev.draft,
        ...patch,
      },
    }));
  };

  const ensureShiftOption = (value) => {
    const normalized = String(value || '').trim();
    if (!normalized) return;
    setShiftOptions((prev) => (prev.includes(normalized) ? prev : [...prev, normalized]));
  };

  const addShiftOption = () => {
    const normalized = String(newShiftValue || '').trim();
    if (!normalized) return;
    ensureShiftOption(normalized);
    updateEditorDraft({ shift: normalized });
    setNewShiftValue('');
  };

  const saveBatch = () => {
    const draft = editorState.draft;
    const batches = Number(draft.batches);

    if (!draft.formulationId) {
      toast.error('Selecione uma formulação.');
      return;
    }

    if (!Number.isFinite(batches) || batches <= 0) {
      toast.error('Informe um número de bateladas maior que zero.');
      return;
    }

    if (!draft.mixer?.trim()) {
      toast.error('Informe o misturador.');
      return;
    }

    ensureShiftOption(draft.shift);

    const dayKey = draft.dayKey;
    const formula = formulationMap.get(draft.formulationId);

    if (editorState.mode === 'create') {
      const line = {
        id: makeId(),
        dayKey,
        formulationId: draft.formulationId,
        batches,
        mixer: draft.mixer.trim(),
        shift: draft.shift,
        sourceLocation: draft.sourceLocation,
        createdAt: new Date().toISOString(),
      };

      setPlanningByDay((prev) => ({
        ...prev,
        [dayKey]: [...(prev[dayKey] || []), line],
      }));

      appendSystemLog({
        action: 'Agendamento PMP',
        action_type: 'create',
        location: 'PMP',
        parameters: {
          date: dayKey,
          formulation: formula?.nome || formula?.material_final || draft.formulationId,
          batches,
          mixer: line.mixer,
          shift: line.shift,
          source_location: line.sourceLocation,
        },
      });

      toast.success('Lote agendado com sucesso.');
    } else {
      const sourceDayKey = editorState.originalDayKey;
      const updatedLine = {
        id: editorState.lineId,
        dayKey,
        formulationId: draft.formulationId,
        batches,
        mixer: draft.mixer.trim(),
        shift: draft.shift,
        sourceLocation: draft.sourceLocation,
        updatedAt: new Date().toISOString(),
      };

      setPlanningByDay((prev) => {
        const next = { ...prev };
        const sourceList = [...(next[sourceDayKey] || [])].filter((line) => line.id !== editorState.lineId);
        next[sourceDayKey] = sourceList;

        if (!next[dayKey]) next[dayKey] = [];

        if (dayKey === sourceDayKey) {
          next[dayKey] = (prev[dayKey] || []).map((line) => (line.id === editorState.lineId ? { ...line, ...updatedLine } : line));
        } else {
          next[dayKey] = [...next[dayKey], { ...updatedLine, createdAt: new Date().toISOString() }];
        }

        return next;
      });

      appendSystemLog({
        action: 'Reagendamento PMP',
        action_type: 'update',
        location: 'PMP',
        parameters: {
          from_date: sourceDayKey,
          to_date: dayKey,
          formulation: formula?.nome || formula?.material_final || draft.formulationId,
          batches,
          mixer: updatedLine.mixer,
          shift: updatedLine.shift,
          source_location: updatedLine.sourceLocation,
        },
      });

      toast.success('Lote atualizado com sucesso.');
    }

    setSelectedDayKey(dayKey);
    closeEditor();
  };

  const removeBatch = (dayKey, lineId) => {
    setPlanningByDay((prev) => ({
      ...prev,
      [dayKey]: (prev[dayKey] || []).filter((line) => line.id !== lineId),
    }));

    appendSystemLog({
      action: 'Remoção de lote PMP',
      action_type: 'delete',
      location: 'PMP',
      parameters: { date: dayKey, line_id: lineId },
    });
  };

  const navigateWeek = (direction) => {
    const next = new Date(focusDate);
    next.setDate(next.getDate() + direction * 7);
    setFocusDate(next);
  };

  const sendDayToLegacy = (dayKey) => {
    const lines = planningByDay[dayKey] || [];

    const payload = {
      exportedAt: new Date().toISOString(),
      dayKey,
      lines: lines.map((line) => {
        const formula = formulationMap.get(line.formulationId);
        return {
          id: line.id,
          formulationId: line.formulationId,
          formulationName: formula?.nome || formula?.material_final || 'Formulação',
          batches: line.batches,
          mixer: line.mixer,
          shift: line.shift,
          sourceLocation: line.sourceLocation,
          estimatedCompoundKg: Number(formula?.peso_batelada_kg || 0) * Number(line.batches || 0),
        };
      }),
    };

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LEGACY_HANDOFF_KEY, JSON.stringify(payload));
    }

    appendSystemLog({
      action: 'Envio da Programação PMP para legado',
      action_type: 'transfer',
      location: 'PMP',
      parameters: { date: dayKey, total_batches: lines.length },
    });

    toast.success('Programação enviada para o Composto Planning legado.');
    window.location.href = createPageUrl('PlanejamentoComposto');
  };

  const renderBatchCard = (line) => {
    const formula = formulationMap.get(line.formulationId);
    const details = planningCalculations.detailsByEntry.get(line.id) || [];
    const openedSacks = details.reduce((sum, row) => sum + row.openedSacks, 0);

    return (
      <div key={line.id} className="rounded-lg border border-border p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-medium text-sm">{formula?.nome || 'Formulação removida'}</p>
            <p className="text-xs text-muted-foreground">
              {line.batches} batelada(s) • {line.mixer} • Turno {line.shift}
            </p>
          </div>
          <Badge variant="secondary">{openedSacks} saco(s)</Badge>
        </div>

        <div className="space-y-1">
          {details.length === 0 && <p className="text-xs text-muted-foreground">Sem ingredientes mapeados.</p>}
          {details.map((row) => (
            <div key={`${line.id}-${row.materialKey}`} className="text-xs flex flex-wrap items-center justify-between gap-1">
              <span className="text-foreground">{row.materialName}</span>
              <span className="text-muted-foreground">
                consumo {row.requiredKg.toFixed(2)}kg • abriu {row.openedSacks} saco(s) • saldo PMP {row.leftoverAfter.toFixed(2)}kg
              </span>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between gap-2 pt-1">
          <Badge variant="outline">Origem MP: {line.sourceLocation}</Badge>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={() => openEditModal(line)}>
              <Pencil className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => removeBatch(line.dayKey, line.id)}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const selectedDate = fromDayKey(selectedDayKey);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-foreground">
            <FlaskConical className="w-6 h-6 text-primary" />
            Programação PMP
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Planejamento em calendário por dia/semana com consumo em sacos e saldo PMP usando sobra primeiro.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link to={createPageUrl('PlanejamentoComposto')}>
            <Button variant="outline">Abrir Composto Planning legado</Button>
          </Link>
          <Button variant="outline" onClick={() => sendDayToLegacy(selectedDayKey)} disabled={dayEntries.length === 0}>
            <Send className="w-4 h-4 mr-2" />
            Enviar dia selecionado ao legado
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Lotes planejados</CardDescription>
            <CardTitle className="text-2xl">{summary.totalEntries}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total de bateladas</CardDescription>
            <CardTitle className="text-2xl">{summary.totalBatches}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Composto estimado (kg)</CardDescription>
            <CardTitle className="text-2xl">{summary.totalCompoundKg.toFixed(0)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Alertas de estoque</CardDescription>
            <CardTitle className="text-2xl">{summary.warningCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-primary" />
            Calendário de Programação PMP
          </CardTitle>
          <CardDescription>
            Use o botão + em cada dia para agendar lotes com formulação, misturador e turno (expansível).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 justify-between">
            <div className="flex items-center gap-2">
              <Button variant={viewMode === 'week' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('week')}>
                Semana
              </Button>
              <Button variant={viewMode === 'day' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('day')}>
                Dia
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => navigateWeek(-1)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline">{formatDate(focusDate)}</Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="single"
                    selected={focusDate}
                    onSelect={(date) => {
                      if (!date) return;
                      setFocusDate(date);
                      setSelectedDayKey(toDayKey(date));
                    }}
                    className="p-3 pointer-events-auto"
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <Button variant="outline" size="icon" onClick={() => navigateWeek(1)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {viewMode === 'week' && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {weekDays.map((day) => {
                const lines = planningByDay[day.key] || [];

                return (
                  <Card key={day.key}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <CardTitle className="text-base capitalize">{day.label}</CardTitle>
                          <CardDescription>{day.key}</CardDescription>
                        </div>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            setSelectedDayKey(day.key);
                            openCreateModal(day.key);
                          }}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {lines.length === 0 && <p className="text-sm text-muted-foreground">Sem lotes planejados.</p>}
                      {lines.map((line) => renderBatchCard({ ...line, dayKey: day.key }))}
                      {lines.length > 0 && (
                        <Button variant="outline" size="sm" className="w-full" onClick={() => sendDayToLegacy(day.key)}>
                          <Send className="w-4 h-4 mr-2" />
                          Enviar dia ao legado
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {viewMode === 'day' && (
            <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Selecionar dia</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => {
                      if (!date) return;
                      setSelectedDayKey(toDayKey(date));
                      setFocusDate(date);
                    }}
                    className="p-3 pointer-events-auto"
                  />
                  <Button className="w-full" onClick={() => openCreateModal(selectedDayKey)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Novo lote no dia
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <CardTitle className="text-base">Programação de {selectedDayKey}</CardTitle>
                      <CardDescription>
                        {dayEntries.length} lote(s) planejado(s) para o dia.
                      </CardDescription>
                    </div>
                    <Button variant="outline" onClick={() => sendDayToLegacy(selectedDayKey)} disabled={dayEntries.length === 0}>
                      <Send className="w-4 h-4 mr-2" />
                      Enviar ao legado
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {dayEntries.length === 0 && <p className="text-sm text-muted-foreground">Sem lotes planejados.</p>}
                  {dayEntries.map((line) => renderBatchCard({ ...line, dayKey: selectedDayKey }))}
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Factory className="w-4 h-4 text-primary" />
            Consumo de MP em sacos e saldo PMP
          </CardTitle>
          <CardDescription>
            O cálculo sempre consome primeiro o saldo remanescente no PMP antes de abrir novos sacos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {planningCalculations.materialSummary.length === 0 && (
            <p className="text-sm text-muted-foreground">Adicione lotes no calendário para visualizar consumo.</p>
          )}

          {planningCalculations.materialSummary.map((row) => (
            <div key={row.materialKey} className="rounded-lg border border-border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{row.materialName}</p>
                <Badge variant="secondary">Saco: {row.sackKg}kg</Badge>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 text-sm">
                <p className="text-muted-foreground">Consumo: <span className="text-foreground">{row.requiredKg.toFixed(2)}kg</span></p>
                <p className="text-muted-foreground">Sacos abertos: <span className="text-foreground">{row.openedSacks}</span></p>
                <p className="text-muted-foreground">Usado de sobra PMP: <span className="text-foreground">{row.fromLeftoverKg.toFixed(2)}kg</span></p>
                <p className="text-muted-foreground">Saldo PMP final: <span className="text-foreground">{row.leftoverKg.toFixed(2)}kg</span></p>
              </div>
            </div>
          ))}

          {planningCalculations.stockWarnings.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <p className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                  Alertas de estoque por local
                </p>
                {planningCalculations.stockWarnings.map((warning) => (
                  <div key={warning.key} className="rounded-lg border border-border p-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium">{warning.materialName} • {warning.location}</p>
                      <Badge variant={warning.isCritical ? 'destructive' : 'secondary'}>
                        {warning.isCritical ? 'Crítico' : 'Baixo'}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground mt-1">
                      Disponível: {warning.availableKg.toFixed(2)}kg • Retirada planejada: {warning.drawnKg.toFixed(2)}kg •
                      Saldo previsto: {warning.remainingKg.toFixed(2)}kg
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={editorState.open} onOpenChange={(open) => (open ? null : closeEditor())}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editorState.mode === 'create' ? 'Novo lote PMP' : 'Editar lote PMP'}</DialogTitle>
            <DialogDescription>
              Informe formulação, bateladas, misturador e turno. O turno padrão é 2 e novos turnos podem ser adicionados.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Dia</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    {editorState.draft.dayKey}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={fromDayKey(editorState.draft.dayKey)}
                    onSelect={(date) => date && updateEditorDraft({ dayKey: toDayKey(date) })}
                    className="p-3 pointer-events-auto"
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-1.5">
              <Label>Formulação</Label>
              <Select value={editorState.draft.formulationId} onValueChange={(value) => updateEditorDraft({ formulationId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {formulacoes.map((formula) => (
                    <SelectItem key={formula.id} value={formula.id}>
                      {formula.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Bateladas</Label>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={editorState.draft.batches}
                  onChange={(event) => updateEditorDraft({ batches: event.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Origem MP</Label>
                <Select value={editorState.draft.sourceLocation} onValueChange={(value) => updateEditorDraft({ sourceLocation: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STOCK_LOCATIONS.map((location) => (
                      <SelectItem key={location} value={location}>
                        {location}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Misturador</Label>
                <Select value={editorState.draft.mixer} onValueChange={(value) => updateEditorDraft({ mixer: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEFAULT_MIXERS.map((mixer) => (
                      <SelectItem key={mixer} value={mixer}>
                        {mixer}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Ou digite outro misturador"
                  value={editorState.draft.mixer}
                  onChange={(event) => updateEditorDraft({ mixer: event.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Turno</Label>
                <Select value={editorState.draft.shift} onValueChange={(value) => updateEditorDraft({ shift: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {shiftOptions.map((shift) => (
                      <SelectItem key={shift} value={shift}>
                        Turno {shift}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex gap-2">
                  <Input
                    placeholder="Adicionar turno"
                    value={newShiftValue}
                    onChange={(event) => setNewShiftValue(event.target.value)}
                  />
                  <Button type="button" variant="outline" onClick={addShiftOption}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeEditor}>Cancelar</Button>
            <Button onClick={saveBatch}>{editorState.mode === 'create' ? 'Agendar lote' : 'Salvar alterações'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
