import { useState, type FormEvent } from 'react';
import { Building2, Loader as Loader2, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

const WorkspaceSetup = () => {
  const { signOut } = useAuth();
  const [companyName, setCompanyName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const name = companyName.trim();
    if (name.length < 2) {
      setError("Saisissez le nom de votre entreprise (2 caractères minimum).");
      return;
    }
    setIsSaving(true);
    setError(null);
    const { error: rpcError } = await supabase.rpc('create_workspace', { p_company_name: name });
    if (rpcError) {
      console.error('[WorkspaceSetup] create_workspace failed:', rpcError.message);
      setError("Impossible de créer votre espace. Réessayez dans un instant.");
      setIsSaving(false);
      return;
    }
    toast.success('Votre espace est prêt');
    window.location.assign('/dashboard');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-center">
            <Building2 className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">Créez votre espace</h1>
            <p className="text-sm text-muted-foreground">Donnez un nom à votre entreprise pour commencer.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="company-name" className="text-sm font-medium text-foreground">Nom de l'entreprise</label>
            <input
              id="company-name"
              value={companyName}
              onChange={e => setCompanyName(e.target.value)}
              placeholder="Ex. Gestion Soleil"
              autoComplete="organization"
              className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
            />
            {error && <p role="alert" className="text-xs text-red-400">{error}</p>}
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60 min-h-[44px]"
          >
            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
            Créer mon espace
          </button>
        </form>

        <button
          type="button"
          onClick={() => signOut()}
          className="w-full flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors min-h-[44px]"
        >
          <LogOut className="w-4 h-4" /> Se déconnecter
        </button>
      </div>
    </div>
  );
};

export default WorkspaceSetup;
