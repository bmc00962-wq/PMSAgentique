import { useState } from 'react';
import { Webhook, Copy, CheckCircle2, ExternalLink, Eye, EyeOff } from 'lucide-react';
import { MOCK_WEBHOOKS } from '@/lib/workflowMockData';
import { cn } from '@/lib/utils';

const WebhookTestPanel = () => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showSecret, setShowSecret] = useState(false);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const baseUrl = 'https://pms-n8n.yourdomain.com';

  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Webhook className="w-4 h-4 text-cyan-400" />
          Webhooks Enregistrés
          <span className="text-xs font-normal bg-secondary px-2 py-0.5 rounded-full text-muted-foreground">
            {MOCK_WEBHOOKS.length} endpoints
          </span>
        </h3>
        <button
          onClick={() => setShowSecret(v => !v)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {showSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          {showSecret ? 'Masquer secrets' : 'Voir secrets'}
        </button>
      </div>

      {/* Webhook list */}
      <div className="space-y-3">
        {MOCK_WEBHOOKS.map(wh => {
          const fullUrl = `${baseUrl}${wh.endpoint_path}`;
          return (
            <div key={wh.id} className={cn(
              'border rounded-xl p-4 space-y-3',
              wh.is_active ? 'border-border bg-secondary/20' : 'border-border/50 bg-secondary/10 opacity-60',
            )}>
              {/* URL row */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className={cn(
                  'text-xs font-mono font-bold px-2 py-0.5 rounded border flex-shrink-0',
                  wh.method === 'POST' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20',
                )}>{wh.method}</span>
                <code className="text-xs font-mono text-cyan-300 flex-1 min-w-0 truncate">{fullUrl}</code>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => copyToClipboard(fullUrl, `url-${wh.id}`)}
                    className="p-1.5 rounded-lg hover:bg-secondary transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center"
                    title="Copier URL"
                  >
                    {copiedId === `url-${wh.id}`
                      ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
                  </button>
                  <a href="#" className="p-1.5 rounded-lg hover:bg-secondary transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center">
                    <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                  </a>
                </div>
              </div>

              {/* Secret + meta */}
              <div className="flex items-center justify-between gap-4 text-xs text-muted-foreground flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">Header:</span>
                  <code className="font-mono text-slate-300">{wh.secret_header}</code>
                  <span className="text-slate-400">:</span>
                  {showSecret
                    ? <code className="font-mono text-yellow-400 text-xs">hmac-sha256-••••••••</code>
                    : <span className="font-mono tracking-widest">••••••••</span>}
                  <button
                    onClick={() => copyToClipboard('hmac-sha256-demo-secret', `sec-${wh.id}`)}
                    className="p-1 rounded hover:bg-secondary transition-colors"
                  >
                    {copiedId === `sec-${wh.id}`
                      ? <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      : <Copy className="w-3 h-3" />}
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <span>{wh.calls_count} appels</span>
                  {wh.last_called_at && (
                    <span>Dernier: {new Date(wh.last_called_at).toLocaleDateString('fr')}</span>
                  )}
                  <span className={cn('px-2 py-0.5 rounded-full border text-xs font-medium',
                    wh.is_active ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-secondary text-muted-foreground border-border',
                  )}>
                    {wh.is_active ? 'Actif' : 'Inactif'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Security note */}
      <div className="bg-secondary/30 border border-amber-500/15 rounded-lg p-3 text-xs text-muted-foreground">
        <span className="text-amber-400 font-semibold">ADR-016</span> — Validation HMAC-SHA256 obligatoire ·
        Replay protection (timestamp &lt; 5 min) · Secrets stockés dans Supabase Secrets · Jamais en clair
      </div>
    </div>
  );
};

export default WebhookTestPanel;
