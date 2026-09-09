import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import {
  Palette, Type, Grid3X3, Layers, MousePointer2, Smartphone,
  CheckCircle2, AlertTriangle, Info, XCircle, ChevronRight,
  Bell, Home, Settings, Search, Plus, ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Section wrapper ───────────────────────────────────────────────────────────
const Section = ({ title, icon: Icon, children }: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) => (
  <div className="bg-card border border-border rounded-xl p-5 space-y-4">
    <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
      <Icon className="w-4 h-4 text-primary" />
      {title}
    </h2>
    {children}
  </div>
);

const Token = ({ name, value, preview }: { name: string; value: string; preview: React.ReactNode }) => (
  <div className="flex items-center gap-3">
    {preview}
    <div>
      <div className="text-xs font-mono text-foreground font-semibold">{name}</div>
      <div className="text-xs text-muted-foreground">{value}</div>
    </div>
  </div>
);

// ── Main ──────────────────────────────────────────────────────────────────────
const DesignSystemPage = () => {
  const [demoInput, setDemoInput] = useState('');
  const [demoTab, setDemoTab] = useState(0);

  return (
    <AppLayout>
      <div className="p-6 space-y-6 max-w-5xl">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-bold text-foreground">Design System</h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary font-medium">ADR-022 FROZEN</span>
          </div>
          <p className="text-sm text-muted-foreground">Tokens · Typography · Spacing · Components · Accessibility</p>
        </div>

        {/* Physical Metaphor */}
        <div className="bg-gradient-to-r from-primary/10 via-blue-500/5 to-transparent border border-primary/20 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-1">Métaphore physique : Glass + Architecture</h3>
          <p className="text-sm text-muted-foreground">Surfaces mates sombres · Bordures subtiles · Profondeur par couches de cartes · Pas d'ombres lourdes.</p>
          <div className="flex gap-3 mt-3 flex-wrap">
            {[
              { label: 'Matte surface', cls: 'bg-card border border-border' },
              { label: 'Secondary', cls: 'bg-secondary/60 border border-border' },
              { label: 'Primary tint', cls: 'bg-primary/10 border border-primary/20' },
              { label: 'Emphasis', cls: 'bg-amber-500/10 border border-amber-500/20' },
            ].map(({ label, cls }) => (
              <div key={label} className={cn('px-3 py-2 rounded-lg text-xs font-medium text-foreground', cls)}>{label}</div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Colors */}
          <Section title="Couleurs — Tokens sémantiques" icon={Palette}>
            <div className="space-y-3">
              {[
                { name: '--primary', value: 'Bleu marque · interactions · CTAs', cls: 'bg-primary', text: 'text-primary-foreground' },
                { name: '--secondary', value: 'Fonds subtils · hover states', cls: 'bg-secondary', text: 'text-secondary-foreground' },
                { name: '--card', value: 'Surfaces de cartes', cls: 'bg-card border border-border', text: 'text-foreground' },
                { name: '--muted-foreground', value: 'Labels · captions · texte secondaire', cls: 'bg-muted', text: 'text-muted-foreground' },
                { name: '--border', value: 'Séparateurs · contours', cls: 'bg-border', text: '' },
              ].map(({ name, value, cls, text }) => (
                <Token key={name} name={name} value={value} preview={
                  <div className={cn('w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center', cls)}>
                    <span className={cn('text-xs font-bold', text)}>Aa</span>
                  </div>
                } />
              ))}
              {/* Semantic colors */}
              <div className="pt-2 border-t border-border">
                <div className="text-xs text-muted-foreground mb-2">Couleurs sémantiques</div>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: 'Success', cls: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' },
                    { label: 'Warning', cls: 'bg-amber-500/10 border-amber-500/20 text-amber-400' },
                    { label: 'Error', cls: 'bg-red-500/10 border-red-500/20 text-red-400' },
                    { label: 'Info', cls: 'bg-blue-500/10 border-blue-500/20 text-blue-400' },
                  ].map(({ label, cls }) => (
                    <span key={label} className={cn('text-xs px-2.5 py-1 rounded-full border font-medium', cls)}>{label}</span>
                  ))}
                </div>
              </div>
            </div>
          </Section>

          {/* Typography */}
          <Section title="Typographie — Échelle 16px base" icon={Type}>
            <div className="space-y-3">
              {[
                { label: 'Page title', cls: 'text-2xl font-bold text-foreground', sample: 'Tableau de bord' },
                { label: 'Section heading', cls: 'text-lg font-semibold text-foreground', sample: 'Réservations actives' },
                { label: 'Subsection', cls: 'text-base font-medium text-foreground', sample: 'Détails de la réservation' },
                { label: 'Body', cls: 'text-sm text-foreground', sample: 'Appartement 2 chambres · Montréal · 5 nuits' },
                { label: 'Label/caption', cls: 'text-xs text-muted-foreground', sample: 'Créé le 10 août 2026 à 09:00' },
                { label: 'Mono code', cls: 'text-xs font-mono text-blue-300', sample: 'RES-2026-0147 · tenant_id UUID' },
              ].map(({ label, cls, sample }) => (
                <div key={label}>
                  <span className={cn('block', cls)}>{sample}</span>
                  <span className="text-xs text-muted-foreground/50">{label}</span>
                </div>
              ))}
            </div>
          </Section>

          {/* Spacing */}
          <Section title="Espacement — Grille 8px" icon={Grid3X3}>
            <div className="space-y-2">
              {[4, 8, 12, 16, 24, 32, 48, 64].map(px => (
                <div key={px} className="flex items-center gap-3">
                  <div className="w-12 text-xs font-mono text-muted-foreground text-right">{px}px</div>
                  <div className="bg-primary/30 rounded" style={{ height: 12, width: px }} />
                  <div className="text-xs text-muted-foreground">{px / 4} × base</div>
                </div>
              ))}
            </div>
          </Section>

          {/* Components */}
          <Section title="Composants — États interactifs" icon={MousePointer2}>
            <div className="space-y-4">
              {/* Buttons */}
              <div>
                <div className="text-xs text-muted-foreground mb-2">Boutons</div>
                <div className="flex flex-wrap gap-2">
                  <button className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:opacity-90 transition-opacity min-h-[44px]">
                    Action primaire
                  </button>
                  <button className="px-4 py-2 border border-border text-foreground text-sm font-medium rounded-lg hover:bg-secondary transition-colors min-h-[44px]">
                    Secondaire
                  </button>
                  <button className="px-4 py-2 border border-rose-500/30 text-rose-400 text-sm font-medium rounded-lg hover:bg-rose-500/10 transition-colors min-h-[44px]">
                    Destructif
                  </button>
                  <button disabled className="px-4 py-2 bg-secondary text-muted-foreground/40 text-sm font-medium rounded-lg cursor-not-allowed min-h-[44px]">
                    Désactivé
                  </button>
                </div>
              </div>

              {/* Input */}
              <div>
                <div className="text-xs text-muted-foreground mb-2">Champ de saisie</div>
                <label className="block">
                  <span className="text-xs font-medium text-foreground block mb-1">Email</span>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      value={demoInput}
                      onChange={e => setDemoInput(e.target.value)}
                      placeholder="utilisateur@example.com"
                      className="w-full pl-9 pr-3 py-2.5 bg-secondary/40 border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 min-h-[44px]"
                    />
                  </div>
                </label>
              </div>

              {/* Alerts */}
              <div>
                <div className="text-xs text-muted-foreground mb-2">Alertes</div>
                <div className="space-y-2">
                  {[
                    { icon: CheckCircle2, cls: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400', msg: 'Réservation confirmée avec succès.' },
                    { icon: AlertTriangle, cls: 'bg-amber-500/10 border-amber-500/20 text-amber-400', msg: 'Approbation requise avant exécution.' },
                    { icon: XCircle, cls: 'bg-red-500/10 border-red-500/20 text-red-400', msg: 'Conflit de calendrier détecté.' },
                    { icon: Info, cls: 'bg-blue-500/10 border-blue-500/20 text-blue-400', msg: 'Synchronisation OTA en cours.' },
                  ].map(({ icon: Icon, cls, msg }) => (
                    <div key={msg} className={cn('flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium', cls)}>
                      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                      {msg}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Section>
        </div>

        {/* Tabs demo */}
        <Section title="Navigation — Tabs & Breadcrumb" icon={Layers}>
          <div>
            <div className="flex gap-1 border-b border-border mb-4">
              {['Général', 'Historique', 'Documents', 'Notes'].map((tab, i) => (
                <button key={tab} onClick={() => setDemoTab(i)} className={cn('px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors', demoTab === i ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground')}>
                  {tab}
                </button>
              ))}
            </div>
            <div className="text-sm text-muted-foreground">Contenu de l'onglet &quot;{['Général', 'Historique', 'Documents', 'Notes'][demoTab]}&quot;</div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
            <span className="text-primary font-medium">Dashboard</span>
            <ChevronRight className="w-3 h-3" />
            <span className="hover:text-foreground cursor-pointer">Réservations</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-foreground font-medium">RES-2026-0147</span>
          </div>
        </Section>

        {/* Mobile interfaces */}
        <Section title="Interfaces mobiles spécialisées (RÈGLE-UX-005)" icon={Smartphone}>
          <p className="text-sm text-muted-foreground">
            4 vues mobiles dédiées aux agents terrain. Accessibles via{' '}
            <code className="font-mono text-blue-300">/mobile/*</code>.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Cleaner', path: '/mobile/cleaner', color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/20', role: 'cleaner', desc: 'Jobs + checklist' },
              { label: 'Driver', path: '/mobile/driver', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20', role: 'driver', desc: 'Trajets + navigation' },
              { label: 'Inspector', path: '/mobile/inspector', color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20', role: 'inspector', desc: 'Inspection + photos' },
              { label: 'Technician', path: '/mobile/technician', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', role: 'maintenance_tech', desc: 'Tickets + travaux' },
            ].map(({ label, path, color, bg, role, desc }) => (
              <a key={label} href={path} className={cn('block p-3 rounded-xl border text-center hover:opacity-80 transition-opacity', bg)}>
                <div className={cn('text-sm font-bold mb-0.5', color)}>{label}</div>
                <div className="text-xs text-muted-foreground/70 font-mono">{role}</div>
                <div className="text-xs text-muted-foreground mt-1">{desc}</div>
              </a>
            ))}
          </div>
        </Section>

        {/* RTL + i18n */}
        <Section title="Internationalisation — FR · EN · AR + RTL" icon={Settings}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { lang: 'FR', label: 'Français', dir: 'ltr', sample: 'Tableau de bord · Réservations · Propriétés', active: true },
              { lang: 'EN', label: 'English', dir: 'ltr', sample: 'Dashboard · Reservations · Properties', active: true },
              { lang: 'AR', label: 'العربية', dir: 'rtl', sample: 'لوحة القيادة · الحجوزات · العقارات', active: true },
            ].map(({ lang, label, dir, sample, active }) => (
              <div key={lang} className={cn('border rounded-xl p-3', active ? 'border-primary/20 bg-primary/5' : 'border-border')}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold text-foreground">{lang}</span>
                  <span className="text-xs text-muted-foreground">{label}</span>
                  <span className="text-xs font-mono text-muted-foreground/60 ml-auto">{dir}</span>
                </div>
                <p className={cn('text-xs text-muted-foreground leading-relaxed', dir === 'rtl' ? 'text-right' : '')} dir={dir}>
                  {sample}
                </p>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground pt-2 border-t border-border">
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Contraste ≥ 4.5:1</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Cibles tactiles ≥ 44×44px</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> HTML sémantique (button/a/label)</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Transitions ≤ 300ms</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> 1 CTA primaire par viewport</span>
          </div>
        </Section>

        {/* Icon system */}
        <Section title="Icônes — lucide-react (outline, rounded)" icon={Grid3X3}>
          <div className="flex flex-wrap gap-4">
            {[Home, Settings, Bell, Search, Plus, ArrowRight, CheckCircle2, AlertTriangle, Info, XCircle].map((Icon, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <div className="w-10 h-10 bg-secondary/60 rounded-lg flex items-center justify-center">
                  <Icon className="w-5 h-5 text-foreground" />
                </div>
                <span className="text-xs text-muted-foreground/60">{Icon.displayName ?? `Icon-${i}`}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Style unique : outline · rounded. Taille standard : 16px (w-4 h-4) · 20px (w-5 h-5). Jamais de mélange de styles.</p>
        </Section>
      </div>
    </AppLayout>
  );
};

export default DesignSystemPage;
