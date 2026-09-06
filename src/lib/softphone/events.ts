const EVENT = "finconnex:softphone-open";

export const SOFTPHONE_W = 300;
export const SOFTPHONE_H = 520;

export type SoftphoneOpenDetail = {
  x?: number;
  y?: number;
  phone?: string;
  name?: string;
  relatedTo?: string;
  autoStart?: boolean;
};

export function positionSoftphoneNear(rect: DOMRect) {
  const margin = 8;
  const bar = 48;
  const x = Math.max(
    margin,
    Math.min(rect.right - SOFTPHONE_W, window.innerWidth - SOFTPHONE_W - margin),
  );
  const below = rect.bottom + margin;
  const y =
    below + SOFTPHONE_H + bar > window.innerHeight
      ? Math.max(margin, rect.top - SOFTPHONE_H - margin)
      : below;
  return { x, y };
}

export function openSoftphone(detail: SoftphoneOpenDetail = {}) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVENT, { detail }));
}

export function openSoftphoneNear(
  el: HTMLElement | null,
  extra: Pick<
    SoftphoneOpenDetail,
    "phone" | "name" | "relatedTo" | "autoStart"
  > = {},
) {
  const rect = el?.getBoundingClientRect();
  openSoftphone({
    ...(rect ? positionSoftphoneNear(rect) : {}),
    ...extra,
  });
}

export function subscribeSoftphoneOpen(
  handler: (detail: SoftphoneOpenDetail) => void,
) {
  if (typeof window === "undefined") return () => undefined;
  const onEvent = (event: Event) => {
    handler((event as CustomEvent<SoftphoneOpenDetail>).detail ?? {});
  };
  window.addEventListener(EVENT, onEvent);
  return () => window.removeEventListener(EVENT, onEvent);
}
