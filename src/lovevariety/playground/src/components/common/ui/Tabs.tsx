import type { PrimitiveAtom } from "jotai";
import { useAtom } from "jotai";
import { AutoTransition, HeightTransition } from "../animations/index.ts";

export type TabItem<Key extends string | number = string> = {
  readonly key: Key;
  readonly title: React.ReactNode;
  readonly content: React.ReactNode;
  readonly disabled?: boolean;
};

type TabsProps<Key extends string | number = string> = {
  items: readonly TabItem<Key>[];
  activeKeyAtom: PrimitiveAtom<Key>;
  className?: string;
};

export function Tabs<Key extends string | number = string>(
  props: TabsProps<Key>,
) {
  const { items, activeKeyAtom, className } = props;
  const [active, setActive] = useAtom(activeKeyAtom);

  return (
    <div className={className}>
      <div className="border-ctp-overlay0 mb-4 flex items-center border-b">
        {items.map((item, idx) => {
          const selected = item.key === active;
          return (
            <button
              key={String(item.key)}
              role="tab"
              aria-selected={selected}
              disabled={item.disabled}
              className={
                "-mb-px rounded-t-lg px-4 py-2 transition-colors " +
                (selected
                  ? "border-ctp-mantle bg-ctp-mauve text-ctp-crust border border-b-0 font-semibold"
                  : "text-ctp-text hover:text-ctp-mauve bg-transparent") +
                (idx > 0 ? " ml-2" : "")
              }
              onClick={() => setActive(item.key)}
            >
              {item.title}
            </button>
          );
        })}
      </div>
      <HeightTransition className="bg-ctp-surface0 overflow-hidden rounded-lg shadow-sm">
        <AutoTransition as="div" className="p-4">
          {items.map((item) =>
            item.key === active ? (
              <div key={item.key} role="tabpanel">
                {item.content}
              </div>
            ) : null,
          )}
        </AutoTransition>
      </HeightTransition>
    </div>
  );
}

// Named export declared with `export function Tabs` above.
