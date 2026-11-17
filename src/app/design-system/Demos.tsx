"use client";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Drawer, Modal } from "@/components/ui/Dialog";
import { useToasts } from "@/stores/toast-store";

/** Exercises the overlay components so they can be checked by hand. */
export function Demos() {
  const [modal, setModal] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const push = useToasts((s) => s.push);
  return (
    <div className="flex flex-wrap gap-3">
      <Button variant="secondary" onClick={() => setModal(true)}>Open modal</Button>
      <Button variant="secondary" onClick={() => setDrawer(true)}>Open drawer</Button>
      <Button variant="secondary" onClick={() => push("This is a notification", "success")}>Show toast</Button>
      <Modal open={modal} onClose={() => setModal(false)} label="Example modal"><p className="text-sm text-mute">Focus is trapped here. Press Escape or the close button.</p></Modal>
      <Drawer open={drawer} onClose={() => setDrawer(false)} label="Example drawer"><p className="text-sm text-mute">Slides in from the right edge.</p></Drawer>
    </div>
  );
}
