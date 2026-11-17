/**
 * Microphone access, done the way browsers require:
 *  - the browser's own permission prompt is triggered only by getUserMedia(), and only after a click;
 *  - the app can READ the permission state (where the browser supports it) but can never change it;
 *  - recording needs a secure page (https:// or http://localhost).
 */
export type MicState = "granted" | "denied" | "prompt" | "unknown";
export type MicErrorCode = "insecure" | "unsupported" | "no-recorder" | "denied" | "policy" | "not-found" | "busy" | "aborted" | "unknown";

export interface MicProblem { code: MicErrorCode; message: string; help: string[] }

export function micSupport() {
  if (typeof window === "undefined") return { secure: true, getUserMedia: true, recorder: true };
  return {
    secure: window.isSecureContext,
    getUserMedia: !!navigator.mediaDevices?.getUserMedia,
    recorder: typeof window.MediaRecorder !== "undefined",
  };
}

/** Current permission without prompting. "unknown" where the browser doesn't expose it (e.g. older Safari, Firefox). */
export async function queryMicPermission(): Promise<MicState> {
  try {
    if (!navigator.permissions?.query) return "unknown";
    const r = await navigator.permissions.query({ name: "microphone" as PermissionName });
    return r.state as MicState;
  } catch { return "unknown"; }
}
export async function watchMicPermission(cb: (s: MicState) => void): Promise<() => void> {
  try {
    const r = await navigator.permissions.query({ name: "microphone" as PermissionName });
    const on = () => cb(r.state as MicState);
    r.addEventListener("change", on);
    return () => r.removeEventListener("change", on);
  } catch { return () => {}; }
}

export function browserName(): "chrome" | "edge" | "safari-ios" | "safari" | "firefox" | "samsung" | "other" {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent;
  if (/SamsungBrowser/.test(ua)) return "samsung";
  if (/Edg\//.test(ua)) return "edge";
  if (/Firefox\//.test(ua)) return "firefox";
  if (/iPhone|iPad|iPod/.test(ua)) return "safari-ios";
  if (/Chrome\//.test(ua)) return "chrome";
  if (/Safari\//.test(ua)) return "safari";
  return "other";
}

/** Step-by-step instructions for re-allowing a blocked microphone in this browser. */
export function unblockSteps(): string[] {
  switch (browserName()) {
    case "chrome": case "edge": case "samsung":
      return ["Click the icon to the left of the web address (a lock or sliders icon).", "Find “Microphone” and choose “Allow”.", "Reload the page, then press the button again."];
    case "firefox":
      return ["Click the microphone or lock icon in the address bar.", "Remove the “Blocked” permission for the microphone (click the ×).", "Reload the page and allow the microphone when asked."];
    case "safari":
      return ["Open Safari ▸ Settings (or Preferences) ▸ Websites ▸ Microphone.", "Set this website to “Allow”.", "Reload the page."];
    case "safari-ios":
      return ["Open the iPhone/iPad Settings app ▸ Safari ▸ Microphone, and choose “Ask” or “Allow”.", "Also check Settings ▸ Privacy & Security ▸ Microphone if you use the installed app.", "Return to the page and reload it."];
    default:
      return ["Open your browser's site settings for this page.", "Allow the microphone.", "Reload the page."];
  }
}

export function micProblem(e: unknown): MicProblem {
  const s = micSupport();
  if (!s.secure) return { code: "insecure", message: "The microphone only works on a secure page.", help: ["Open English Mastery through its https:// address (or http://localhost when running it on your own computer)."] };
  if (!s.getUserMedia) return { code: "unsupported", message: "This browser can't use the microphone.", help: ["Use a recent version of Chrome, Edge, Safari or Firefox."] };
  const name = (e as { name?: string })?.name ?? "";
  const msg = (e as { message?: string })?.message ?? "";
  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    if (/permissions policy|feature policy|not allowed in this document|disallowed by permissions policy/i.test(msg))
      return { code: "policy", message: "Microphone access is blocked by the page this app is embedded in.", help: ["Open English Mastery directly in its own browser tab (not inside another website or preview window)."] };
    return { code: "denied", message: "Microphone access was blocked.", help: unblockSteps() };
  }
  if (name === "SecurityError") return { code: "policy", message: "The browser blocked microphone access for this page.", help: ["Open English Mastery directly in its own tab using its https:// address."] };
  if (name === "NotFoundError" || name === "DevicesNotFoundError" || name === "OverconstrainedError")
    return { code: "not-found", message: "No microphone was found.", help: ["Connect a microphone or headset (or check that the built-in one is enabled).", "Then press the button again."] };
  if (name === "NotReadableError" || name === "TrackStartError")
    return { code: "busy", message: "The microphone is unavailable: another app may be using it.", help: ["Close video-call or recording apps and other tabs using the microphone.", "On a computer, check the system privacy settings allow your browser to use the microphone.", "Then try again."] };
  if (name === "AbortError") return { code: "aborted", message: "The microphone stopped unexpectedly.", help: ["Try again. If it keeps happening, reconnect your microphone."] };
  if (!s.recorder) return { code: "no-recorder", message: "This browser can't record audio.", help: ["Update your browser, or use Chrome, Edge, Safari 14.1+ or Firefox."] };
  return { code: "unknown", message: "The microphone couldn't be started.", help: ["Check your device's sound settings and try again."] };
}

/** Asks the browser for the microphone (this shows the browser's own prompt the first time). */
export async function requestMic(): Promise<MediaStream> {
  const s = micSupport();
  if (!s.secure || !s.getUserMedia) throw Object.assign(new Error("unsupported"), { name: s.secure ? "NotSupportedError" : "InsecureContext" });
  return navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
}
export const stopStream = (st: MediaStream | null | undefined) => st?.getTracks().forEach((t) => t.stop());
