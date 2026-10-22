"use client";

import { usePathname, useRouter } from "next/navigation";
import type { MouseEvent, ReactNode } from "react";
import { useCallback, useEffect, useRef } from "react";

type TransitionDocument = Document & {
  startViewTransition?: (callback: () => void | Promise<void>) => { finished: Promise<void> };
};

export default function PublicPageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const pendingResolve = useRef<(() => void) | null>(null);
  const fallbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isAdmin = pathname.startsWith("/admin");

  useEffect(() => {
    if (isAdmin || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const body = document.body;
    body.classList.remove("public-route-changing");
    void body.offsetWidth;
    body.classList.add("public-route-changing");
    const timer = window.setTimeout(() => body.classList.remove("public-route-changing"), 1050);
    return () => {
      window.clearTimeout(timer);
      body.classList.remove("public-route-changing");
    };
  }, [pathname, isAdmin]);

  useEffect(() => {
    if (!pendingResolve.current) return;
    const resolve = pendingResolve.current;
    pendingResolve.current = null;
    if (fallbackTimer.current) window.clearTimeout(fallbackTimer.current);
    requestAnimationFrame(() => resolve());
  }, [pathname]);

  useEffect(() => () => {
    if (fallbackTimer.current) window.clearTimeout(fallbackTimer.current);
    pendingResolve.current?.();
  }, []);

  const onClickCapture = useCallback((event: MouseEvent<HTMLDivElement>) => {
    if (isAdmin || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const target = event.target instanceof Element ? event.target.closest("a") : null;
    if (!target || target.target === "_blank" || target.hasAttribute("download")) return;

    let url: URL;
    try { url = new URL(target.href, window.location.href); } catch { return; }
    if (url.origin !== window.location.origin || url.pathname === pathname || url.pathname.startsWith("/admin") || url.hash && url.pathname === pathname) return;

    event.preventDefault();
    const nextUrl = url.pathname + url.search + url.hash;
    const transitionDocument = document as TransitionDocument;
    const navigate = () => new Promise<void>((resolve) => {
      pendingResolve.current = resolve;
      if (fallbackTimer.current) window.clearTimeout(fallbackTimer.current);
      fallbackTimer.current = window.setTimeout(() => {
        if (pendingResolve.current === resolve) {
          pendingResolve.current = null;
          resolve();
        }
      }, 1400);
      router.push(nextUrl);
    });

    if (transitionDocument.startViewTransition) {
      transitionDocument.startViewTransition(navigate);
    } else {
      document.body.classList.add("public-route-changing");
      router.push(nextUrl);
    }
  }, [isAdmin, pathname, router]);

  return <div className={isAdmin ? "route-frame route-frame-admin" : "route-frame route-frame-public"} onClickCapture={onClickCapture} key={pathname}>{children}</div>;
}
