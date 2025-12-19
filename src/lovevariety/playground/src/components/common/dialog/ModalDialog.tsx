import React, { useEffect, useRef, useState } from "react";
import { AutoTransition, HeightTransition } from "../animations/index.ts";

export type ModalDialogProps = {
  title?: string;
  className?: string;
  children?: React.ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void;
  onOpen?: () => void;
  onCloseAnimationEnd?: () => void;
};

export const ModalDialog: React.FC<ModalDialogProps> = ({
  title,
  className = "",
  children,
  open,
  defaultOpen = false,
  onOpenChange,
  onClose,
  onOpen,
  onCloseAnimationEnd,
}) => {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [internalOpen, setInternalOpen] = useState(defaultOpen);

  const isOpen = open ?? internalOpen;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => {
      if (open === undefined) {
        setInternalOpen(false);
      }
      onOpenChange?.(false);
      onClose?.();
    };

    const handleCancel = (e: Event) => {
      e.preventDefault();
      handleClose();
    };

    dialog.addEventListener("close", handleClose);
    dialog.addEventListener("cancel", handleCancel);

    return () => {
      dialog.removeEventListener("close", handleClose);
      dialog.removeEventListener("cancel", handleCancel);
    };
  }, [open, onOpenChange, onClose]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      dialog.showModal();
      onOpen?.();
    } else {
      dialog.close();
    }
  }, [isOpen, onOpen]);

  const handleTransitionEnd = (e: React.TransitionEvent<HTMLDialogElement>) => {
    if (e.currentTarget !== dialogRef.current) return;
    if (isOpen) return;

    // Only trigger onCloseAnimationEnd after the backdrop/overlay transition ends
    // The overlay property will only be changed when the dialog is closed
    // So you can use it to detect when the close animation finishes
    if (e.propertyName === "overlay") {
      onCloseAnimationEnd?.();
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className={`bg-ctp-base m-auto w-full max-w-xl overflow-clip rounded-lg p-6 opacity-0 shadow-lg transition-all transition-discrete duration-250 backdrop:opacity-0 backdrop:transition-all backdrop:transition-discrete open:opacity-100 open:backdrop:opacity-100 starting:open:opacity-0 starting:open:backdrop:opacity-0 ${className}`}
      onTransitionEnd={handleTransitionEnd}
    >
      {title ? (
        <h3 className="text-ctp-text mb-4 text-lg font-semibold">{title}</h3>
      ) : null}
      <HeightTransition>
        <AutoTransition as="div">{open && children}</AutoTransition>
      </HeightTransition>
    </dialog>
  );
};

ModalDialog.displayName = "ModalDialog";

// ModalDialog is a named export via its declaration above.
