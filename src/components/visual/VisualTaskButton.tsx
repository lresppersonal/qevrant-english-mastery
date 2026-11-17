"use client";
import { useRouter } from "next/navigation";
import { Shuffle } from "lucide-react";
import { newTaskId, type VisualType } from "@/lib/visual";

export function VisualTaskButton({ type, label = "New task", avoid = [], className = "btn btn-ghost !min-h-9 !px-3 text-sm" }: { type: VisualType; label?: string; avoid?: string[]; className?: string }) {
  const router = useRouter();
  return (
    <button type="button" className={className} onClick={() => router.push(`/writing/visual/task?id=${newTaskId(type, avoid)}`)}>
      <Shuffle size={15} aria-hidden="true" /> {label}
    </button>
  );
}
