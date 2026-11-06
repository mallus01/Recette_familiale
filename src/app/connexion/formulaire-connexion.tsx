"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { creerClientNavigateur } from "@/lib/supabase/client";

const DELAI_RENVOI = 60; // secondes, limite d'envoi de Supabase

type Etape = "email" | "code";

export function FormulaireConnexion() {
  const router = useRouter();
  const lienInvalide = useSearchParams().get("erreur") === "lien";

  const [etape, setEtape] = useState<Etape>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(
    lienInvalide
      ? "Ce lien n’est plus valable. Demandez un nouvel e-mail."
      : null,
  );
  const [attente, setAttente] = useState(0);

  useEffect(() => {
    if (attente <= 0) return;
    const minuteur = setTimeout(() => setAttente((s) => s - 1), 1000);
    return () => clearTimeout(minuteur);
  }, [attente]);

  async function envoyerEmail() {
    setEnvoiEnCours(true);
    setErreur(null);
    const { error } = await creerClientNavigateur().auth.signInWithOtp({
      email,
      // Aucune inscription publique : seuls les comptes existants reçoivent un e-mail.
      options: { shouldCreateUser: false },
    });
    setEnvoiEnCours(false);
    // Une adresse inconnue est traitée comme une autre, pour ne pas révéler qui a un compte.
    const adresseInconnue = [
      "otp_disabled",
      "signup_disabled",
      "user_not_found",
    ].includes(error?.code ?? "");
    if (error && !adresseInconnue) {
      setErreur(
        error.status === 429 || error.code === "over_email_send_rate_limit"
          ? "Trop de demandes. Patientez une minute avant de réessayer."
          : "L’e-mail n’a pas pu être envoyé. Vérifiez votre connexion et réessayez.",
      );
      return;
    }
    setEtape("code");
    setCode("");
    setAttente(DELAI_RENVOI);
  }

  async function verifierCode(e: FormEvent) {
    e.preventDefault();
    setEnvoiEnCours(true);
    setErreur(null);
    const { error } = await creerClientNavigateur().auth.verifyOtp({
      email,
      token: code,
      type: "email",
    });
    setEnvoiEnCours(false);
    if (error) {
      setErreur(
        "Ce code n’est pas valable ou a expiré. Vérifiez-le ou demandez un nouvel e-mail.",
      );
      return;
    }
    router.replace("/");
    router.refresh();
  }

  if (etape === "email") {
    return (
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          envoyerEmail();
        }}
      >
        <label className="flex flex-col gap-2">
          <span className="font-medium">Adresse e-mail</span>
          <input
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value.trim())}
            className="rounded-xl border border-ardoise/30 px-4 py-3 text-base outline-none focus:border-ardoise"
          />
        </label>
        <Erreur texte={erreur} />
        <BoutonPrincipal desactive={envoiEnCours}>
          {envoiEnCours ? "Envoi…" : "Recevoir le lien de connexion"}
        </BoutonPrincipal>
      </form>
    );
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={verifierCode}>
      <p className="leading-relaxed">
        Un e-mail vient de partir vers{" "}
        <strong className="font-semibold">{email}</strong>. Touchez le lien
        qu’il contient, ou saisissez le code à 6 chiffres ci-dessous. Il est
        valable 15 minutes.
      </p>
      <label className="flex flex-col gap-2">
        <span className="font-medium">Code à 6 chiffres</span>
        <input
          required
          autoComplete="one-time-code"
          inputMode="numeric"
          pattern="[0-9]{6}"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          className="rounded-xl border border-ardoise/30 px-4 py-3 text-center text-2xl tracking-[0.5em] outline-none focus:border-ardoise"
        />
      </label>
      <Erreur texte={erreur} />
      <BoutonPrincipal desactive={envoiEnCours || code.length !== 6}>
        {envoiEnCours ? "Vérification…" : "Se connecter"}
      </BoutonPrincipal>
      <div className="flex flex-col items-start gap-3 text-sm">
        <button
          type="button"
          disabled={attente > 0 || envoiEnCours}
          onClick={envoyerEmail}
          className="font-medium text-ardoise underline decoration-ciel decoration-2 underline-offset-4 disabled:text-ardoise/50 disabled:no-underline"
        >
          {attente > 0
            ? `Renvoyer l’e-mail (dans ${attente} s)`
            : "Renvoyer l’e-mail"}
        </button>
        <button
          type="button"
          onClick={() => {
            setEtape("email");
            setErreur(null);
          }}
          className="text-taupe underline underline-offset-4"
        >
          Changer d’adresse e-mail
        </button>
      </div>
    </form>
  );
}

function Erreur({ texte }: { texte: string | null }) {
  if (!texte) return null;
  return (
    <p
      role="alert"
      className="rounded-xl border border-peche bg-peche/15 px-4 py-3 text-sm"
    >
      {texte}
    </p>
  );
}

function BoutonPrincipal({
  desactive,
  children,
}: {
  desactive: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={desactive}
      className="rounded-xl bg-ardoise px-5 py-3.5 font-semibold text-white disabled:opacity-60"
    >
      {children}
    </button>
  );
}
