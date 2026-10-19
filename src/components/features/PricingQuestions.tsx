import { useState } from 'react';
import { Plus, Minus } from 'lucide-react';
import type { PricingCopy } from '@/types/pricing';

interface PricingQuestionsProps { labels: PricingCopy }
const PricingQuestions = ({ labels: l }: PricingQuestionsProps) => {
  const [expanded, setExpanded] = useState<number | null>(null);
  return (
    <section className="space-y-3">
      <h2 className="mb-4 text-lg font-semibold text-foreground">{l.faqTitle}</h2>
      {l.faq.map((item, index) => <div key={index} className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
        <button type="button" aria-expanded={expanded === index} aria-controls={`pricing-answer-${index}`} onClick={() => setExpanded(expanded === index ? null : index)} className="flex min-h-[52px] w-full items-center justify-between gap-4 px-5 py-4 text-start text-base font-medium text-foreground hover:bg-accent/30">
          {item.q}{expanded === index ? <Minus className="h-4 w-4 shrink-0 text-primary" /> : <Plus className="h-4 w-4 shrink-0 text-primary" />}
        </button>
        {expanded === index && <p id={`pricing-answer-${index}`} className="border-t border-border px-5 py-4 text-base leading-relaxed text-muted-foreground">{item.a}</p>}
      </div>)}
    </section>
  );
};
export default PricingQuestions;
