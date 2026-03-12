import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users } from 'lucide-react';

export default function GestaoUsuarios() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Users className="w-5 h-5 text-primary" />
          Gestão de Usuários
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Módulo de usuários disponível. Se quiser, eu implemento agora CRUD completo de perfis e permissões.
        </p>
      </CardContent>
    </Card>
  );
}
