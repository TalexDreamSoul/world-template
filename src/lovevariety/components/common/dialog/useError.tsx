import { type ErrorOptions, useDialog } from "./dialog.tsx";

export function useError() {
  const { showError } = useDialog();

  return (options: ErrorOptions): Promise<void> => {
    return showError(options);
  };
}
