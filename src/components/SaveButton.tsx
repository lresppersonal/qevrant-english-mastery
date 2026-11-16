"use client";
import { Bookmark, BookmarkCheck } from "lucide-react";
import clsx from "clsx";
import { useLearner } from "./StoreProvider";
import type { SavedType } from "@/lib/store/types";

export function SaveButton({ itemType, itemRef, label, context, sourceRef, compact }: {
  itemType: SavedType; itemRef: string; label: string; context?: string | null; sourceRef?: string | null; compact?: boolean;
}) {
  const { isSaved, toggleSave, ready } = useLearner();
  const saved = !!isSaved(itemType, itemRef);
  return (
    <button type="button" disabled={!ready} onClick={() => toggleSave({ itemType, itemRef, label, context, sourceRef })}
      aria-pressed={saved} aria-label={saved ? `Remove ${label} from library` : `Save ${label}`}
      className={clsx("btn", compact ? "h-9 !min-h-0 !px-2.5" : "", saved ? "btn-ghost text-primary" : "btn-ghost")}>
      {saved ? <BookmarkCheck size={17} aria-hidden="true" /> : <Bookmark size={17} aria-hidden="true" />}
      {!compact && (saved ? "Saved" : "Save")}
    </button>
  );
}
