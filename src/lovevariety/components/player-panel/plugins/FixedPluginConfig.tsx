import type { plugins } from "@miehoukingdom/world-interface";
import { Direction } from "@miehoukingdom/world-runtime";
import { Fragment, useCallback, useId } from "react";
import { AutoTransition, HeightTransition, Label } from "../../common/index.ts";
import type { PluginConfigProps } from "../pluginRegistry";

export type FixedPluginConfigProps =
  PluginConfigProps<plugins.fixed.FixedProps>;

const directionOptions = [
  { value: Direction.Up, label: "上" },
  { value: Direction.Down, label: "下" },
  { value: Direction.Left, label: "左" },
  { value: Direction.Right, label: "右" },
] as const;

export function FixedPluginConfig({ value, onChange }: FixedPluginConfigProps) {
  const inputId = useId();

  const handleEnable = useCallback(() => {
    onChange({ x: 0, y: 0, direction: Direction.Down });
  }, [onChange]);

  const handleDisable = useCallback(() => {
    onChange(undefined);
  }, [onChange]);

  const handleXChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!value) return;
      const x = parseInt(e.target.value, 10);
      if (!isNaN(x)) {
        onChange({ ...value, x });
      }
    },
    [value, onChange],
  );

  const handleYChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!value) return;
      const y = parseInt(e.target.value, 10);
      if (!isNaN(y)) {
        onChange({ ...value, y });
      }
    },
    [value, onChange],
  );

  const handleDirectionChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      if (!value) return;
      const direction = parseInt(e.target.value, 10) as Direction;
      onChange({ ...value, direction });
    },
    [value, onChange],
  );

  const inner = value ? (
    <Fragment key="some">
      <div className="mb-2 flex items-center justify-between">
        <Label className="text-ctp-text">固定位置</Label>
        <button
          onClick={handleDisable}
          className="text-ctp-red hover:text-ctp-maroon text-xs transition-colors"
        >
          删除
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {/* X 坐标 */}
        <div>
          <label
            htmlFor={`${inputId}-x`}
            className="text-ctp-subtext0 mb-1 block text-xs"
          >
            X
          </label>
          <input
            id={`${inputId}-x`}
            type="number"
            value={value.x}
            onChange={handleXChange}
            className="border-ctp-surface1 bg-ctp-base focus:border-ctp-mauve text-ctp-text w-full rounded border px-2 py-1 text-sm focus:outline-none"
          />
        </div>

        {/* Y 坐标 */}
        <div>
          <label
            htmlFor={`${inputId}-y`}
            className="text-ctp-subtext0 mb-1 block text-xs"
          >
            Y
          </label>
          <input
            id={`${inputId}-y`}
            type="number"
            value={value.y}
            onChange={handleYChange}
            className="border-ctp-surface1 bg-ctp-base focus:border-ctp-mauve text-ctp-text w-full rounded border px-2 py-1 text-sm focus:outline-none"
          />
        </div>

        {/* 方向 */}
        <div>
          <label
            htmlFor={`${inputId}-dir`}
            className="text-ctp-subtext0 mb-1 block text-xs"
          >
            朝向
          </label>
          <select
            id={`${inputId}-dir`}
            value={value.direction}
            onChange={handleDirectionChange}
            className="border-ctp-surface1 bg-ctp-base focus:border-ctp-mauve text-ctp-text w-full rounded border px-2 py-1 text-sm focus:outline-none"
          >
            {directionOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </Fragment>
  ) : (
    <Fragment key="none">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-ctp-text">固定位置</Label>
          <p className="text-ctp-subtext0 text-xs">设置角色初始位置和朝向</p>
        </div>
        <button
          onClick={handleEnable}
          className="bg-ctp-surface1 hover:bg-ctp-surface2 text-ctp-text rounded px-3 py-1 text-sm transition-colors"
        >
          启用
        </button>
      </div>
    </Fragment>
  );

  return (
    <HeightTransition className="bg-ctp-surface0 rounded-lg">
      <AutoTransition as="div" className="p-3">
        {inner}
      </AutoTransition>
    </HeightTransition>
  );
}
