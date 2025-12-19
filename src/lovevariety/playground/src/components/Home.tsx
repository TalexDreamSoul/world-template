import { ScriptList } from "./ScriptList.tsx";
import { Header } from "./common/index.ts";

export function Home() {
  return (
    <div>
      <Header title="MicroSandbox Playground" />
      <div className="m-auto max-w-6xl p-2">
        <ScriptList />
      </div>
    </div>
  );
}

// No default export — prefer named export for consistency
