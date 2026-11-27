import { useId, useState, type KeyboardEvent, type ReactNode } from 'react';

export function AdminTabs<T extends string>({ label, items, value, onChange, render }: {
  label: string; items: readonly { id: T; name: string }[]; value: T;
  onChange: (value: T) => void; render: (value: T) => ReactNode;
}) {
  const id = useId();
  const [visited, setVisited] = useState(() => new Set<T>([value]));
  function onKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const last = items.length - 1;
    const positions: Record<string, number> = {
      ArrowLeft: index === 0 ? last : index - 1,
      ArrowRight: index === last ? 0 : index + 1,
      Home: 0, End: last,
    };
    const position = positions[event.key];
    if (position === undefined) return;
    event.preventDefault();
    event.currentTarget.parentElement?.querySelectorAll('button')[position]?.focus();
  }

  return <>
    <div className="admin-tabs" role="tablist" aria-label={label}>
      {items.map(({ id: key, name }, index) => <button key={key} type="button" role="tab" id={id + '-' + key}
        aria-controls={id + '-panel-' + key} aria-selected={key === value} tabIndex={key === value ? 0 : -1}
        onClick={() => { setVisited(previous => previous.has(key) ? previous : new Set([...previous, key])); onChange(key); }}
        onKeyDown={event => onKey(event, index)}>
        {name}
      </button>)}
    </div>
    {items.map(({ id: key }) => <div className="min-w-0 space-y-4" key={key} role="tabpanel"
      id={id + '-panel-' + key} aria-labelledby={id + '-' + key} hidden={key !== value}>
      {(key === value || visited.has(key)) && render(key)}
    </div>)}
  </>;
}
