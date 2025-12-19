import { plugins } from "@miehoukingdom/world-interface";
import { useId } from "react";
import { Label } from "../../common/index.ts";
import type { PluginConfigProps } from "../pluginRegistry";

export interface TeamPluginConfigProps extends PluginConfigProps<number> {
  /**
   * 队伍列表，来自 TeamPlugin.teams
   */
  teams: plugins.team.Team[];
}

export function TeamPluginConfig({
  value,
  teams,
  onChange,
}: TeamPluginConfigProps) {
  const selectId = useId();

  return (
    <div className="bg-ctp-surface0 rounded-lg p-3">
      <Label htmlFor={selectId} className="text-ctp-text mb-2 block">
        所属队伍
      </Label>
      {/* 显示所有队伍为列表项: 点击选择，选中项高亮 */}
      <div
        id={selectId}
        role="listbox"
        aria-label="所属队伍"
        className="flex flex-wrap gap-2"
      >
        {teams.map((team: plugins.team.Team, index: number) => {
          const isSelected = value !== undefined ? value === index : false;
          return (
            <button
              key={index}
              type="button"
              role="option"
              aria-selected={isSelected}
              onClick={() => onChange(index)}
              className={`flex min-w-0 items-center gap-2 rounded border px-3 py-1 text-sm transition-colors duration-100 focus:outline-none ${isSelected ? "bg-ctp-mauve border-ctp-mauve text-ctp-base" : "border-ctp-surface1 bg-ctp-base text-ctp-text hover:bg-ctp-surface1"}`}
            >
              <span
                className="inline-block size-2 rounded-full"
                style={{ backgroundColor: team.color }}
              />
              <span className="truncate" title={team.name}>
                {team.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
