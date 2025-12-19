import { nanoid } from "nanoid/non-secure";
import React, { createContext, useCallback, useContext, useState } from "react";
import { Button } from "../ui/index.ts";
import { ModalDialog } from "./ModalDialog.tsx";

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

export interface AlertOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  variant?: "info" | "warning" | "error" | "success";
}

export interface ErrorOptions {
  title?: string;
  message: string;
  detail?: string;
  confirmLabel?: string;
}

interface BaseDialogRequest {
  id: string;
  open: boolean;
}

interface ConfirmDialogRequest extends BaseDialogRequest {
  type: "confirm";
  options: ConfirmOptions;
  resolve: (value: boolean) => void;
}

interface AlertDialogRequest extends BaseDialogRequest {
  type: "alert";
  options: AlertOptions;
  resolve: () => void;
}

interface ErrorDialogRequest extends BaseDialogRequest {
  type: "error";
  options: ErrorOptions;
  resolve: () => void;
}

type DialogRequest =
  | ConfirmDialogRequest
  | AlertDialogRequest
  | ErrorDialogRequest;

interface DialogContextValue {
  showConfirm: (options: ConfirmOptions) => Promise<boolean>;
  showAlert: (options: AlertOptions) => Promise<void>;
  showError: (options: ErrorOptions) => Promise<void>;
}

const DialogContext = createContext<DialogContextValue | null>(null);

export function useDialog(): DialogContextValue {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error("useDialog must be used within a DialogProvider");
  }
  return context;
}

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [dialogs, setDialogs] = useState<DialogRequest[]>([]);

  const showConfirm = useCallback(
    (options: ConfirmOptions): Promise<boolean> => {
      return new Promise<boolean>((resolve) => {
        const id = nanoid(9);
        const request: ConfirmDialogRequest = {
          id,
          type: "confirm",
          options,
          resolve,
          open: true,
        };
        setDialogs((prev) => [...prev, request]);
      });
    },
    [],
  );

  const showAlert = useCallback((options: AlertOptions): Promise<void> => {
    return new Promise<void>((resolve) => {
      const id = nanoid(9);
      const request: AlertDialogRequest = {
        id,
        type: "alert",
        options,
        resolve,
        open: true,
      };
      setDialogs((prev) => [...prev, request]);
    });
  }, []);

  const showError = useCallback((options: ErrorOptions): Promise<void> => {
    return new Promise<void>((resolve) => {
      const id = nanoid(9);
      const request: ErrorDialogRequest = {
        id,
        type: "error",
        options,
        resolve,
        open: true,
      };
      setDialogs((prev) => [...prev, request]);
    });
  }, []);

  // Begin closing: set the dialog to closed state so the animation plays, and resolve immediately.
  const beginCloseDialog = useCallback((id: string, result?: boolean) => {
    setDialogs((prev) =>
      prev.map((d) => {
        if (d.id !== id || !d.open) return d;
        // Resolve immediately when closing starts
        if (d.type === "confirm") {
          d.resolve(result ?? false);
        } else {
          d.resolve();
        }
        return { ...d, open: false };
      }),
    );
  }, []);

  // Finalize the dialog removal after the close animation is done.
  const finalizeCloseDialog = useCallback((id: string) => {
    setDialogs((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const handleCancel = useCallback(
    (id: string) => {
      beginCloseDialog(id, false);
    },
    [beginCloseDialog],
  );

  const handleConfirm = useCallback(
    (id: string) => {
      beginCloseDialog(id, true);
    },
    [beginCloseDialog],
  );

  const handleDismiss = useCallback(
    (id: string) => {
      beginCloseDialog(id);
    },
    [beginCloseDialog],
  );

  const getAlertButtonVariant = (variant?: AlertOptions["variant"]) => {
    switch (variant) {
      case "error":
        return "danger";
      case "warning":
      case "success":
      case "info":
      default:
        return "primary";
    }
  };

  return (
    <DialogContext.Provider value={{ showConfirm, showAlert, showError }}>
      {children}
      {dialogs.map((dialog) => {
        if (dialog.type === "confirm") {
          return (
            <ModalDialog
              key={dialog.id}
              title={dialog.options.title}
              open={dialog.open}
              onOpenChange={(open) => {
                if (!open) beginCloseDialog(dialog.id, false);
              }}
              onCloseAnimationEnd={() => finalizeCloseDialog(dialog.id)}
            >
              <div className="mb-4">{dialog.options.message}</div>
              <div className="flex justify-end space-x-2">
                {dialog.options.cancelLabel !== undefined && (
                  <Button
                    variant="secondary"
                    onClick={() => handleCancel(dialog.id)}
                  >
                    {dialog.options.cancelLabel || "取消"}
                  </Button>
                )}
                <Button
                  variant={dialog.options.danger ? "danger" : "primary"}
                  onClick={() => handleConfirm(dialog.id)}
                >
                  {dialog.options.confirmLabel || "确定"}
                </Button>
              </div>
            </ModalDialog>
          );
        }

        if (dialog.type === "alert") {
          return (
            <ModalDialog
              key={dialog.id}
              title={dialog.options.title}
              open={dialog.open}
              onOpenChange={(open) => {
                if (!open) handleDismiss(dialog.id);
              }}
              onCloseAnimationEnd={() => finalizeCloseDialog(dialog.id)}
            >
              <div className="mb-4">{dialog.options.message}</div>
              <div className="flex justify-end">
                <Button
                  variant={getAlertButtonVariant(dialog.options.variant)}
                  onClick={() => handleDismiss(dialog.id)}
                >
                  {dialog.options.confirmLabel || "确定"}
                </Button>
              </div>
            </ModalDialog>
          );
        }

        if (dialog.type === "error") {
          return (
            <ModalDialog
              key={dialog.id}
              title={dialog.options.title || "错误"}
              open={dialog.open}
              onOpenChange={(open) => {
                if (!open) handleDismiss(dialog.id);
              }}
              onCloseAnimationEnd={() => finalizeCloseDialog(dialog.id)}
            >
              <div className="text-ctp-red mb-2">{dialog.options.message}</div>
              {dialog.options.detail && (
                <details className="bg-ctp-surface0 text-ctp-subtext0 mb-4 rounded p-2 text-xs">
                  <summary className="cursor-pointer select-none">
                    详细信息
                  </summary>
                  <pre className="mt-2 overflow-auto whitespace-pre-wrap">
                    {dialog.options.detail}
                  </pre>
                </details>
              )}
              <div className="flex justify-end">
                <Button
                  variant="danger"
                  onClick={() => handleDismiss(dialog.id)}
                >
                  {dialog.options.confirmLabel || "确定"}
                </Button>
              </div>
            </ModalDialog>
          );
        }

        return null;
      })}
    </DialogContext.Provider>
  );
}
