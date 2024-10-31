import { useState } from "react";

export const useModal = () => {
  const [open, setOpen] = useState(false);
  
  return {
    open,
    onOpen: () => setOpen(true),
    onClose: () => setOpen(false)
  }
}