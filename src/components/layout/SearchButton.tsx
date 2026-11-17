"use client";
import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";

/** Submits a real GET to /shop?q=…, which the shop page filters by product name. */
export function SearchButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label="Search" className="grid size-11 place-items-center rounded-sm hover:bg-ink/8">
        <Icon name="search" />
      </button>
      <Modal open={open} onClose={() => setOpen(false)} label="Search">
        <form action="/shop" method="get" role="search" className="flex flex-col gap-4">
          <label htmlFor="site-search" className="sr-only">Search products</label>
          <input id="site-search" name="q" type="search" autoComplete="off" placeholder="Search products"
            className="h-12 w-full rounded-sm border border-line bg-paper px-4 text-base placeholder:text-mute" />
          <Button type="submit">Search</Button>
        </form>
      </Modal>
    </>
  );
}
