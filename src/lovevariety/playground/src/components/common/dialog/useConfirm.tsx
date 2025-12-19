import { type ConfirmOptions, useDialog } from "./dialog.tsx";

export function useConfirm() {
  const { showConfirm } = useDialog();

  return (options: ConfirmOptions): Promise<boolean> => {
    return showConfirm(options);
  };
}
