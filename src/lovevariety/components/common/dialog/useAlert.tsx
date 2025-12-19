import { type AlertOptions, useDialog } from "./dialog.tsx";

export function useAlert() {
  const { showAlert } = useDialog();

  return (options: AlertOptions): Promise<void> => {
    return showAlert(options);
  };
}
