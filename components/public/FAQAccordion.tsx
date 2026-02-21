export interface FaqItem {
  question: string;
  answer: string;
}

export function FAQAccordion({ items }: { items: FaqItem[] }) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <details
          key={item.question}
          className="group rounded-2xl border border-slate-200 bg-white px-5 py-4 open:border-blue-200 open:bg-blue-50/40"
        >
          <summary className="cursor-pointer list-none pr-8 text-sm font-bold text-slate-900">
            {item.question}
          </summary>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">{item.answer}</p>
        </details>
      ))}
    </div>
  );
}

