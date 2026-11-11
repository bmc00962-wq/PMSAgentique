// TasksPage — Live tasks; RLS limits staff to tasks assigned to them, managers see all
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ClipboardList } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import LoadingSpinner from '@/components/features/LoadingSpinner';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

type TaskStatus = 'todo' | 'in_progress' | 'done' | 'cancelled';

interface TaskRow {
  id: string;
  task_type: 'housekeeping' | 'maintenance' | 'transport';
  title: string;
  description: string | null;
  status: TaskStatus;
  due_at: string | null;
  version: number;
}

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'À faire',
  in_progress: 'En cours',
  done: 'Terminée',
  cancelled: 'Annulée',
};

const TYPE_LABELS: Record<TaskRow['task_type'], string> = {
  housekeeping: 'Ménage',
  maintenance: 'Maintenance',
  transport: 'Transport',
};

const NEXT_STATUS: Partial<Record<TaskStatus, TaskStatus>> = {
  todo: 'in_progress',
  in_progress: 'done',
};

const FILTERS: Array<{ value: TaskStatus | 'all'; label: string }> = [
  { value: 'all', label: 'Toutes' },
  { value: 'todo', label: 'À faire' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'done', label: 'Terminées' },
];

async function fetchTasks(tenantId: string): Promise<TaskRow[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('id, task_type, title, description, status, due_at, version')
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .order('due_at', { ascending: true, nullsFirst: false });

  if (error) {
    console.error('[TasksPage] fetchTasks:', error.message);
    throw new Error('Impossible de charger les tâches.');
  }
  return (data ?? []) as TaskRow[];
}

const TasksPage = () => {
  const { membership } = useAuth();
  const tenantId = membership?.tenant_id ?? '';
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<TaskStatus | 'all'>('all');

  const { data: tasks = [], isPending, isError, refetch } = useQuery({
    queryKey: ['tasks', tenantId],
    queryFn: () => fetchTasks(tenantId),
    enabled: !!tenantId,
  });

  const advance = useMutation({
    mutationFn: async (task: TaskRow) => {
      const next = NEXT_STATUS[task.status];
      if (!next) throw new Error('Cette tâche ne peut plus être avancée.');
      const { data, error } = await supabase
        .from('tasks')
        .update({ status: next, version: task.version + 1, updated_at: new Date().toISOString() })
        .eq('id', task.id)
        .eq('version', task.version)
        .select('id');
      if (error) {
        console.error('[TasksPage] advance:', error.message);
        throw new Error('Impossible de mettre à jour la tâche.');
      }
      if (!data || data.length === 0) {
        throw new Error('Cette tâche a été modifiée par quelqu’un d’autre. Actualisez la page.');
      }
    },
    onSuccess: () => {
      toast.success('Tâche mise à jour');
      queryClient.invalidateQueries({ queryKey: ['tasks', tenantId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const visible = filter === 'all' ? tasks : tasks.filter(t => t.status === filter);

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Mes tâches</h1>
          <p className="text-sm text-muted-foreground mt-1">Les tâches qui vous sont assignées.</p>
        </div>

        <div className="flex gap-2 flex-wrap" role="tablist">
          {FILTERS.map(f => (
            <button
              key={f.value}
              type="button"
              role="tab"
              aria-selected={filter === f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                'px-3 py-2 rounded-lg text-sm min-h-[40px] transition-colors',
                filter === f.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-foreground hover:bg-secondary/80',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {isPending && tenantId ? (
          <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
        ) : isError ? (
          <div className="rounded-xl border border-border p-6 text-center space-y-3">
            <p className="text-sm text-muted-foreground">Impossible de charger les tâches.</p>
            <button type="button" onClick={() => refetch()} className="px-4 py-2 rounded-lg bg-secondary text-foreground text-sm min-h-[40px]">
              Réessayer
            </button>
          </div>
        ) : visible.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center">
            <ClipboardList className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">Aucune tâche pour le moment.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {visible.map(task => {
              const next = NEXT_STATUS[task.status];
              return (
                <li key={task.id} className="rounded-xl border border-border bg-card p-4 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">{TYPE_LABELS[task.task_type]}</p>
                    <p className="font-medium text-foreground truncate">{task.title}</p>
                    {task.description && <p className="text-sm text-muted-foreground mt-1">{task.description}</p>}
                    <p className="text-xs text-muted-foreground mt-2">{STATUS_LABELS[task.status]}</p>
                  </div>
                  {next && (
                    <button
                      type="button"
                      disabled={advance.isPending}
                      onClick={() => advance.mutate(task)}
                      className="shrink-0 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm min-h-[40px] disabled:opacity-50 transition-opacity"
                    >
                      {next === 'in_progress' ? 'Commencer' : 'Terminer'}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </AppLayout>
  );
};

export default TasksPage;
