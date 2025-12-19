import type { MapSchema } from "../db.ts";
import {
  EventLogPanel,
  SandboxHeader,
  SandboxProvider,
  SandboxRenderer,
  useSandboxContext,
} from "./sandbox/index.ts";

export type ScriptSandboxProps = {
  map: MapSchema.Map;
  script: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  extraOptions?: any;
};

/**
 * 事件日志面板包装组件
 * 从 context 获取 store 并渲染面板
 */
function EventLogPanelWrapper() {
  const { eventLogStore } = useSandboxContext();
  return <EventLogPanel store={eventLogStore} />;
}

/**
 * ScriptSandbox 主组件
 * 使用 SandboxProvider 包装 Header 和 Renderer
 */
export function ScriptSandbox({
  map,
  script,
  extraOptions,
}: ScriptSandboxProps) {
  return (
    <SandboxProvider map={map} script={script} extraOptions={extraOptions}>
      <div className="flex h-screen flex-col">
        <SandboxHeader />
        <SandboxRenderer />
        <EventLogPanelWrapper />
      </div>
    </SandboxProvider>
  );
}
