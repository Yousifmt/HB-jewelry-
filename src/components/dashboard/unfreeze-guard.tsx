"use client"

import { useEffect } from "react"

export function UnfreezeGuard() {
  useEffect(() => {
    const fix = () => {
      // لا تلمس بورتالات Radix نفسها، فقط الجذر/المحتوى
      document.querySelectorAll<HTMLElement>('body[aria-hidden="true"], #__next[aria-hidden="true"]').forEach((el) => {
        el.removeAttribute("aria-hidden")
      })
      document.querySelectorAll<HTMLElement>('[inert]').forEach((el) => {
        // لا تزيل inert من بورتالات مخصّصة
        if (!el.closest('[data-radix-portal]')) el.removeAttribute("inert")
      })
    }
    // مرة الآن + راقب لفترة قصيرة
    fix()
    const obs = new MutationObserver(fix)
    obs.observe(document.body, { attributes: true, subtree: true, attributeFilter: ["aria-hidden", "inert"] })
    return () => obs.disconnect()
  }, [])
  return null
}
