import { useAtomValue } from "jotai";
import { appStateAtom } from "../contexts.ts";
import { AutoTransition, DialogProvider } from "./common/index.ts";
import { Home } from "./Home.tsx";
import { ScriptRunner } from "./ScriptRunner.tsx";
import { ScriptSandbox } from "./ScriptSandbox.tsx";

export function App() {
  const state = useAtomValue(appStateAtom);
  return (
    <DialogProvider>
      <AutoTransition as="div">
        {state.type === "home" && <Home />}
        {state.type === "script-runner" && (
          <ScriptRunner script={state.script} />
        )}
        {state.type === "script-sandbox" && (
          <ScriptSandbox
            script={state.script}
            map={state.map}
            extraOptions={state.extraOptions}
          />
        )}
      </AutoTransition>
    </DialogProvider>
  );
}
