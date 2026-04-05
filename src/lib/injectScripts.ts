import type { Database } from "@/lib/database.types";

type ScriptInjection = Database["public"]["Tables"]["script_injections"]["Row"];

export function injectScripts(scripts: ScriptInjection[], area: "admin" | "student") {
  // Remove previously injected elements
  document.querySelectorAll("[data-lumi-injected]").forEach((el) => el.remove());

  const filtered = scripts.filter((s) => {
    if (!s.enabled) return false;
    if (s.apply_to === "all") return true;
    if (s.apply_to === "admin_only") return area === "admin";
    if (s.apply_to === "student_only") return area === "student";
    if (s.apply_to === "specific_pages") {
      return s.specific_pages?.some((p) => window.location.pathname.startsWith(p));
    }
    return false;
  });

  filtered.forEach((script) => {
    const wrapper = document.createElement("div");
    wrapper.setAttribute("data-lumi-injected", script.id);
    wrapper.innerHTML = script.content;

    // Re-create script elements so the browser executes them
    wrapper.querySelectorAll("script").forEach((oldScript) => {
      const newScript = document.createElement("script");
      Array.from(oldScript.attributes).forEach((attr) =>
        newScript.setAttribute(attr.name, attr.value),
      );
      newScript.textContent = oldScript.textContent;
      oldScript.replaceWith(newScript);
    });

    if (script.position === "head") {
      document.head.appendChild(wrapper);
    } else if (script.position === "body_start") {
      document.body.prepend(wrapper);
    } else {
      document.body.appendChild(wrapper);
    }
  });
}
