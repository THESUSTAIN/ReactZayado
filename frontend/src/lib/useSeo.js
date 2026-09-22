import { useEffect } from "react";

export function useSeo({ title, description }) {
  useEffect(() => {
    document.title = title;
    let m = document.querySelector('meta[name="description"]');
    if (!m) {
      m = document.createElement("meta");
      m.name = "description";
      document.head.appendChild(m);
    }
    m.setAttribute("content", description);
  }, [title, description]);
}
