import { useEffect, useRef } from "react";
import type { CodeTunnel } from "@/zayado/types";

/* Code personnalisé d'un tunnel (saisi par l'admin) : HTML injecté avec exécution des <script>. */

function copieExecutable(ancien: HTMLScriptElement): HTMLScriptElement {
  const s = document.createElement("script");
  for (const a of Array.from(ancien.attributes)) s.setAttribute(a.name, a.value);
  s.text = ancien.text;
  return s;
}

function executerScripts(racine: Element) {
  racine.querySelectorAll("script").forEach((ancien) => ancien.replaceWith(copieExecutable(ancien)));
}

export function BlocHtml({ html, testId }: { html: string; testId: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = html;
    executerScripts(ref.current);
  }, [html]);
  return html ? <div ref={ref} data-testid={testId} /> : null;
}

/** Ajoute head / CSS / JS à la page publique, et les retire en quittant la page. */
export function useCodeTunnel(code?: Partial<CodeTunnel>) {
  const { head = "", css = "", js = "" } = code ?? {};
  useEffect(() => {
    const ajoutes: Element[] = [];
    if (head) {
      const tmp = document.createElement("div");
      tmp.innerHTML = head;
      Array.from(tmp.children).forEach((el) => {
        const n = el instanceof HTMLScriptElement ? copieExecutable(el) : el;
        document.head.appendChild(n);
        if (!(n instanceof HTMLScriptElement)) executerScripts(n);
        ajoutes.push(n);
      });
    }
    if (css) {
      const st = document.createElement("style");
      st.dataset.tunnelCode = "css";
      st.textContent = css;
      document.head.appendChild(st);
      ajoutes.push(st);
    }
    if (js) {
      const sc = document.createElement("script");
      sc.dataset.tunnelCode = "js";
      sc.text = js;
      document.body.appendChild(sc);
      ajoutes.push(sc);
    }
    return () => ajoutes.forEach((el) => el.remove());
  }, [head, css, js]);
}
