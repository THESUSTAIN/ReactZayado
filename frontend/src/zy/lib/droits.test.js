import { test, expect, vi } from "vitest";

vi.mock("@/zy/lib/acces", () => ({ chargerAbonnement: () => Promise.resolve(null) }));
const { ORDRE_OFFRES, OFFRES_PAYANTES, NOMS_OFFRES_PAYANTES, aDroit, planEffectif } = await import("./droits");

test("offres payantes : ordre et libellés inchangés", () => {
  expect(OFFRES_PAYANTES).toEqual(["reveur", "serenite", "pro", "business", "entreprise"]);
  expect(NOMS_OFFRES_PAYANTES).toEqual({ reveur: "Rêveur", serenite: "Solo", pro: "Pro", business: "Équipe", entreprise: "Entreprise" });
  expect(ORDRE_OFFRES[0]).toBe("essentielle");
});

test("droits par module", () => {
  expect(aDroit("reveur", "cockpit")).toBe(false);
  expect(aDroit("serenite", "cockpit")).toBe(true);
  expect(aDroit("pro", "agent_business")).toBe(true);
  expect(aDroit("serenite", "agent_business")).toBe(false);
  expect(planEffectif({ acces: "suspendu", plan: "pro" })).toBe("essentielle");
  expect(planEffectif({ equipe: true, plan: "pro" })).toBe("serenite");
});
