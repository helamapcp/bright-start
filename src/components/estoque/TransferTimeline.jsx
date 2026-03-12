import React, { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const formatTime = (value) => (value ? new Date(value).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--');

const toDay = (value) => {
  if (!value) return '';
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date.toISOString().slice(0, 10);
};

const inferEventType = (event) => {
  if (event.eventType) return event.eventType;
  const action = String(event.action || '').toLowerCase();
  if (action.includes('request created')) return 'request_created';
  if (action.includes('op generated')) return 'op_generated';
  if (action.includes('separation order')) return 'separation_order_created';
  if (action.includes('separation started')) return 'separation_started';
  if (action.includes('separation completed') || action.includes('separation confirmed')) return 'separation_completed';
  if (action.includes('stock transfer posted')) return 'stock_transfer_posted';
  if (action.includes('materials received')) return 'material_received';
  return 'other';
};

const EVENT_TYPE_OPTIONS = [
  { value: 'all', label: 'All events' },
  { value: 'request_created', label: 'Transfer request created' },
  { value: 'op_generated', label: 'OP generated' },
  { value: 'separation_order_created', label: 'Separation order created' },
  { value: 'separation_started', label: 'Separation started' },
  { value: 'separation_completed', label: 'Separation completed' },
  { value: 'stock_transfer_posted', label: 'Stock transfer posted' },
  { value: 'material_received', label: 'Material received at destination' },
  { value: 'other', label: 'Other' },
];

export default function TransferTimeline({ events }) {
  const [eventType, setEventType] = useState('all');
  const [userName, setUserName] = useState('all');
  const [location, setLocation] = useState('all');
  const [datePreset, setDatePreset] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const availableUsers = useMemo(() => {
    const users = new Set((events || []).map((event) => String(event.userName || '—')).filter(Boolean));
    return Array.from(users).sort((a, b) => a.localeCompare(b));
  }, [events]);

  const availableLocations = useMemo(() => {
    const locations = new Set((events || []).map((event) => String(event.location || '—')).filter(Boolean));
    return Array.from(locations).sort((a, b) => a.localeCompare(b));
  }, [events]);

  const filteredEvents = useMemo(() => {
    const now = new Date();
    const minPresetDate = (() => {
      if (datePreset === 'last7') {
        const d = new Date(now);
        d.setDate(d.getDate() - 7);
        d.setHours(0, 0, 0, 0);
        return d;
      }
      if (datePreset === 'last30') {
        const d = new Date(now);
        d.setDate(d.getDate() - 30);
        d.setHours(0, 0, 0, 0);
        return d;
      }
      return null;
    })();

    return (events || []).filter((event) => {
      const type = inferEventType(event);
      if (eventType !== 'all' && eventType !== type) return false;
      if (userName !== 'all' && String(event.userName || '—') !== userName) return false;
      if (location !== 'all' && String(event.location || '—') !== location) return false;

      const eventDate = new Date(event.timestamp);
      if (minPresetDate && eventDate < minPresetDate) return false;

      const eventDay = toDay(event.timestamp);
      if (startDate && eventDay < startDate) return false;
      if (endDate && eventDay > endDate) return false;

      return true;
    });
  }, [events, eventType, userName, location, datePreset, startDate, endDate]);

  if (!events?.length) {
    return <p className="text-xs text-muted-foreground">No timeline events yet.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="rounded-md border border-border p-3 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2">
          <div className="space-y-1">
            <Label>Event type</Label>
            <Select value={eventType} onValueChange={setEventType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {EVENT_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>User</Label>
            <Select value={userName} onValueChange={setUserName}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All users</SelectItem>
                {availableUsers.map((option) => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Location</Label>
            <Select value={location} onValueChange={setLocation}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All locations</SelectItem>
                {availableLocations.map((option) => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Quick range</Label>
            <Select value={datePreset} onValueChange={setDatePreset}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All time</SelectItem>
                <SelectItem value="last7">Last 7 days</SelectItem>
                <SelectItem value="last30">Last 30 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label>Start date</Label>
            <Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>End date</Label>
            <Input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
          </div>
        </div>
      </div>

      {filteredEvents.length === 0 ? (
        <p className="text-xs text-muted-foreground">No events found for the selected filters.</p>
      ) : (
        <div className="space-y-2">
          {filteredEvents.map((event) => (
            <div key={event.id} className="flex items-start gap-3 text-sm">
              <Badge variant="outline" className="min-w-14 justify-center">{formatTime(event.timestamp)}</Badge>
              <div>
                <p className="font-medium">{event.action}</p>
                <p className="text-xs text-muted-foreground">
                  {event.userName || '—'} • {event.location || '—'}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
