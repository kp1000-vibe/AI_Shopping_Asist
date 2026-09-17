'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { searchPath } from '@/lib/slug';
import { cn } from '@/lib/utils';

interface SearchBarProps {
  defaultValue?: string;
  placeholder?: string;
  className?: string;
  /** Larger hero treatment with a visible submit button. */
  size?: 'default' | 'hero';
  autoFocus?: boolean;
}

const DEBOUNCE_MS = 220;

export function SearchBar({
  defaultValue = '',
  placeholder = 'Search any product, e.g. AirPods Pro 2',
  className,
  size = 'default',
  autoFocus = false,
}: SearchBarProps) {
  const router = useRouter();
  const [value, setValue] = React.useState(defaultValue);
  const [suggestions, setSuggestions] = React.useState<string[]>([]);
  const [open, setOpen] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(-1);
  const [pending, setPending] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const listboxId = React.useId();

  // Debounced suggestion lookup. Aborts in-flight requests on every keystroke.
  React.useEffect(() => {
    const query = value.trim();
    if (query.length < 2) {
      setSuggestions([]);
      setPending(false);
      return;
    }

    const controller = new AbortController();
    setPending(true);
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/suggest?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error('suggest failed');
        const data: unknown = await response.json();
        const raw =
          typeof data === 'object' && data !== null
            ? (data as { suggestions?: unknown }).suggestions
            : undefined;
        const items = Array.isArray(raw)
          ? raw.filter((item): item is string => typeof item === 'string')
          : [];
        setSuggestions(items);
        setActiveIndex(-1);
      } catch {
        // Suggestions are a convenience: a failure must never block searching.
        setSuggestions([]);
      } finally {
        setPending(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [value]);

  // Close the suggestion list when focus leaves the component.
  React.useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  const go = (query: string) => {
    const trimmed = query.trim();
    if (trimmed.length < 2) return;
    setOpen(false);
    router.push(searchPath(trimmed));
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || suggestions.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % suggestions.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => (index <= 0 ? suggestions.length - 1 : index - 1));
    } else if (event.key === 'Escape') {
      setOpen(false);
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      const chosen = suggestions[activeIndex];
      if (chosen) {
        event.preventDefault();
        setValue(chosen);
        go(chosen);
      }
    }
  };

  const isHero = size === 'hero';

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          go(value);
        }}
        className={cn(
          'flex w-full items-center gap-2 rounded-full border border-input bg-background pl-4 pr-1.5',
          isHero ? 'h-14 shadow-card' : 'h-11',
        )}
      >
        <Search className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <label htmlFor={`${listboxId}-input`} className="sr-only">
          Search for a product
        </label>
        <input
          id={`${listboxId}-input`}
          type="search"
          name="q"
          value={value}
          autoFocus={autoFocus}
          autoComplete="off"
          enterKeyHint="search"
          placeholder={placeholder}
          role="combobox"
          aria-expanded={open && suggestions.length > 0}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={
            activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined
          }
          onChange={(event) => {
            setValue(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className={cn(
            'h-full w-full min-w-0 border-0 bg-transparent p-0 text-base outline-none',
            'placeholder:text-muted-foreground focus:ring-0 md:text-sm',
            '[&::-webkit-search-cancel-button]:appearance-none',
          )}
        />
        {pending ? (
          <Loader2
            className="size-4 shrink-0 animate-spin text-muted-foreground"
            aria-hidden="true"
          />
        ) : null}
        <Button type="submit" size={isHero ? 'default' : 'sm'} className="shrink-0">
          <span className={isHero ? '' : 'sr-only sm:not-sr-only'}>Search</span>
          <Search className={cn('size-4', isHero ? 'hidden' : 'sm:hidden')} aria-hidden="true" />
        </Button>
      </form>

      {open && suggestions.length > 0 ? (
        <ul
          id={listboxId}
          role="listbox"
          aria-label="Search suggestions"
          className="absolute z-40 mt-2 w-full overflow-hidden rounded-xl border border-border bg-popover p-1 shadow-card-hover"
        >
          {suggestions.map((suggestion, index) => (
            <li key={suggestion} role="none">
              <button
                type="button"
                id={`${listboxId}-option-${index}`}
                role="option"
                aria-selected={index === activeIndex}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => {
                  setValue(suggestion);
                  go(suggestion);
                }}
                className={cn(
                  'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm',
                  index === activeIndex ? 'bg-accent text-accent-foreground' : 'hover:bg-accent',
                )}
              >
                <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                {suggestion}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
