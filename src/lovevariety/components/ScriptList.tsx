import { fileOpen } from "browser-fs-access";
import { useSetAtom } from "jotai";
import { ErrorBoundary } from "react-error-boundary";
import { useAsyncTupleDatabase } from "tuple-database/useAsyncTupleDatabase";
import { appStateAtom } from "../contexts.ts";
import { ScriptSchema, db } from "../db.ts";
import { parseScriptMetadata } from "../utils/parseScriptMetadata.ts";
import { useSubspace } from "../utils/useSubspace.ts";
import {
  AutoTransition,
  Button,
  useConfirm,
  useError,
} from "./common/index.ts";

export function ScriptList() {
  const subspace = useSubspace(db, "script");
  const scripts = useAsyncTupleDatabase(subspace, ScriptSchema.list, []);
  const showError = useError();

  const importScript = async () => {
    try {
      const file = await fileOpen({
        description: "JavaScript 脚本文件",
        excludeAcceptAllOption: true,
        extensions: [".js"],
        mimeTypes: ["application/javascript", "text/javascript"],
        multiple: false,
      });

      const text = await file.text();
      try {
        parseScriptMetadata(text);
      } catch (err) {
        console.error(err);
        await showError({
          title: "导入失败",
          message:
            err instanceof Error
              ? err.message
              : "第一行 JSON 注释无效。请检查语法。",
        });
        return;
      }

      // Store the entire file content as the code string (safe now that it's validated)
      ScriptSchema.newScript(subspace, text);
    } catch (err) {
      // User cancelled or other error
      if (err instanceof Error && err.name !== "AbortError") {
        console.error(err);
        await showError({
          title: "导入失败",
          message: "读取文件失败，请重试。",
        });
      }
    }
  };

  return (
    <AutoTransition as="div">
      <Button className="w-full" variant="primary" onClick={importScript}>
        导入脚本文件
      </Button>
      {scripts ? (
        <AutoTransition as="div">
          {scripts.map((script) => (
            <SafeScriptItem key={script.id} script={script} />
          ))}
        </AutoTransition>
      ) : (
        <div className="text-ctp-subtext1 animate-pulse py-4 text-center">
          加载中...
        </div>
      )}
    </AutoTransition>
  );
}

function ScriptItemFallback({
  error,
  script,
}: {
  error: Error | null;
  script: ScriptSchema.Script;
}) {
  const confirm = useConfirm();
  const subspace = useSubspace(db, "script");

  return (
    <div className="border-ctp-surface2 bg-ctp-surface1 mt-2 rounded-lg border p-3 shadow-sm transition-shadow">
      <div className="text-ctp-error text-sm font-medium">加载出错</div>
      <div className="text-ctp-subtext1 mt-2 text-sm wrap-break-word">
        {String(error?.message ?? "未知错误")}
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <Button
          className="px-2 py-1 text-xs"
          variant="danger"
          onClick={async () => {
            const confirmed = await confirm({
              title: `确定删除此脚本吗？`,
              message: "此操作不能撤销。",
              confirmLabel: "删除",
              cancelLabel: "取消",
              danger: true,
            });
            if (confirmed) {
              try {
                ScriptSchema.remove(subspace, script.id);
              } catch (err) {
                console.error(err);
              }
            }
          }}
        >
          删除
        </Button>
      </div>
    </div>
  );
}

function SafeScriptItem({ script }: { script: ScriptSchema.Script }) {
  return (
    <ErrorBoundary
      fallbackRender={({ error }) => (
        <ScriptItemFallback error={error as Error} script={script} />
      )}
    >
      <ScriptItem script={script} />
    </ErrorBoundary>
  );
}

function ScriptItem({ script }: { script: ScriptSchema.Script }) {
  const setAppState = useSetAtom(appStateAtom);
  const subspace = useSubspace(db, "script");
  const confirm = useConfirm();
  const metadata = parseScriptMetadata(script.content);
  const displayName = metadata.name;
  const description = metadata.description;

  async function handleDelete() {
    const confirmed = await confirm({
      title: `确定删除 “${displayName}” 吗？`,
      message: "此操作不能撤销。",
      confirmLabel: "删除",
      cancelLabel: "取消",
      danger: true,
    });
    if (confirmed) {
      try {
        ScriptSchema.remove(subspace, script.id);
      } catch (err) {
        console.error(err);
      }
    }
  }

  return (
    <div className="border-ctp-surface2 bg-ctp-surface1 mt-2 rounded-lg border p-3 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 overflow-hidden">
          <div
            className="text-ctp-text truncate text-sm font-medium"
            title={displayName}
          >
            {displayName}
          </div>
        </div>

        <div className="ml-2 shrink-0">
          <Button
            className="px-2 py-1 text-xs"
            variant="ghost"
            onClick={handleDelete}
          >
            删除
          </Button>
        </div>
      </div>

      <div className="text-ctp-subtext1 mt-2 text-sm">{description}</div>

      <div className="mt-3 grid gap-2">
        <Button
          className="w-full"
          variant="primary"
          onClick={() => {
            setAppState({ type: "script-runner", script: script.content });
          }}
        >
          运行
        </Button>
      </div>
    </div>
  );
}
