import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { CONSIGNE, ResultatLecture } from "./resultat";

// Lecture d'une page par un modèle d'IA de vision. Le modèle est interchangeable, pour
// pouvoir les comparer sur de vraies pages (US-11) : variable LECTURE_IA = claude, gemini
// (ou simulee pour les tests). Les clés restent dans les variables d'environnement.

export type Lecture = { resultat: ResultatLecture; modele: string };

const MODELE_CLAUDE = process.env.LECTURE_MODELE_CLAUDE || "claude-opus-5-5";
const MODELE_GEMINI = process.env.LECTURE_MODELE_GEMINI || "gemini-3.8-flash";

export function fournisseurChoisi(): "claude" | "gemini" | "simulee" | null {
  const choix = process.env.LECTURE_IA;
  if (choix === "claude" || choix === "gemini" || choix === "simulee") return choix;
  if (process.env.ANTHROPIC_API_KEY) return "claude";
  if (process.env.GEMINI_API_KEY) return "gemini";
  return null;
}

export async function lirePage(image: Uint8Array, typeMime: string): Promise<Lecture> {
  const fournisseur = fournisseurChoisi();
  if (fournisseur === "claude") return lireAvecClaude(image, typeMime);
  if (fournisseur === "gemini") return lireAvecGemini(image, typeMime);
  if (fournisseur === "simulee") return lectureSimulee();
  throw new Error("Aucune IA configurée : ajoutez ANTHROPIC_API_KEY ou GEMINI_API_KEY");
}

async function lireAvecClaude(image: Uint8Array, typeMime: string): Promise<Lecture> {
  const client = new Anthropic(); // lit ANTHROPIC_API_KEY
  const reponse = await client.beta.messages
    .stream({
      model: MODELE_CLAUDE,
      max_tokens: 32000,
      thinking: { type: "adaptive" },
      output_config: { effort: "high", format: betaZodOutputFormat(ResultatLecture) },
      // Si le modèle décline la demande, l'API la relance sur un autre modèle.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: CONSIGNE,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: typeMime as "image/jpeg",
                data: Buffer.from(image).toString("base64"),
              },
            },
            { type: "text", text: "Voici la page à lire." },
          ],
        },
      ],
    })
    .finalMessage();

  if (reponse.stop_reason === "refusal") throw new Error("Lecture refusée par le modèle");
  if (reponse.stop_reason === "max_tokens") throw new Error("Lecture tronquée");
  const texte = reponse.content.find((b) => b.type === "text");
  if (!texte || texte.type !== "text") throw new Error("Réponse vide");
  return { resultat: ResultatLecture.parse(JSON.parse(texte.text)), modele: reponse.model };
}

async function lireAvecGemini(image: Uint8Array, typeMime: string): Promise<Lecture> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const reponse = await ai.models.generateContent({
    model: MODELE_GEMINI,
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { mimeType: typeMime, data: Buffer.from(image).toString("base64") } },
          { text: "Voici la page à lire." },
        ],
      },
    ],
    config: {
      systemInstruction: CONSIGNE,
      responseMimeType: "application/json",
      responseJsonSchema: z.toJSONSchema(ResultatLecture),
    },
  });
  if (!reponse.text) throw new Error("Réponse vide");
  return { resultat: ResultatLecture.parse(JSON.parse(reponse.text)), modele: MODELE_GEMINI };
}

// Pour les tests sans clé : une recette fixe, après un court délai.
async function lectureSimulee(): Promise<Lecture> {
  await new Promise((ok) => setTimeout(ok, 1500));
  if (process.env.LECTURE_SIMULEE_ECHEC === "1") throw new Error("Échec simulé");
  return {
    modele: "simulee",
    resultat: {
      recettes: [
        {
          titre: "Gâteau au yaourt",
          portions: 6,
          duree_minutes: null,
          groupes: [
            {
              nom: null,
              ingredients: [
                { quantite: 1, unite: "pot", nom: "yaourt nature", texte_origine: "1 pot de yaourt" },
                { quantite: 250, unite: "g", nom: "farine", texte_origine: "3 pots de farine" },
              ],
            },
          ],
          etapes: ["Mélanger le yaourt et la farine.", "Cuire 35 minutes à four moyen."],
          notes: ["Recette de tante Paule"],
        },
      ],
      mots_douteux: [{ mot: "Paule", contexte: "Recette de tante Paule" }],
    },
  };
}
