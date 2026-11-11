import { creerClientNavigateur } from "@/lib/supabase/client";
import { type MesureAb, TEST_CARTES } from "@/lib/test-ab";

// Mesure anonyme du test des cartes À cuisiner ; sans effet une fois le test terminé.
// Une mesure perdue ne doit jamais gêner l'utilisateur : les erreurs sont ignorées.
export function mesurerAb(type: MesureAb) {
  void creerClientNavigateur()
    .rpc("mesurer_ab", { p_test: TEST_CARTES, p_type: type })
    .then(
      () => undefined,
      () => undefined,
    );
}
