import React from 'react';
import { Badge } from '@/components/ui/badge';

const formatTime = (value) => (value ? new Date(value).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--');

export default function TransferTimeline({ events }) {
  if (!events?.length) {
    return <p className="text-xs text-muted-foreground">No timeline events yet.</p>;
  }

  return (
    <div className="space-y-2">
      {events.map((event) => (
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
  );
}
