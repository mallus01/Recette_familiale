"use client";

import { useEffect, useState, useTransition } from "react";
import { expireLe, ROLES } from "@/lib/invitations";
import { LIBELLES_ROLE, type Role } from "@/lib/roles";
import { annuler, changerRole, inviter, renvoyer } from "./actions";

type Invitation = { id: number; email: string; role: Role; envoyee_le: string };
type Membre = { id: string; nom: string; email: string; role: Role };

export function Administration({
  moiId,
  invitations,
  membres,
}: {
  moiId: string;
  invitations: Invitation[];
  membres: Membre[];
}) {
  const [formulaire, setFormulaire] = useState(false);
  const [message, setMessage] = useState<{
    texte: string;
    erreur: boolean;
  } | null>(null);
  const maintenant = useMaintenant();
  const enCours = invitations.filter(
    (i) => expireLe(i.envoyee_le) > maintenant,
  );
  const expirees = invitations.filter(
    (i) => expireLe(i.envoyee_le) <= maintenant,
  );

  return (
    <div className="flex flex-col gap-8">
      {formulaire ? (
        <FormulaireInvitation
          onFini={(texte) => {
            setFormulaire(false);
            setMessage({ texte, erreur: false });
          }}
          onAnnuler={() => setFormulaire(false)}
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            setFormulaire(true);
            setMessage(null);
          }}
          className="rounded-xl bg-ardoise px-5 py-3 font-semibold text-white"
        >
          Inviter un membre
        </button>
      )}
      {message ? (
        <p
          role={message.erreur ? "alert" : "status"}
          className={`-mt-4 text-sm ${message.erreur ? "" : "text-taupe"}`}
        >
          {message.texte}
        </p>
      ) : null}

      <Section
        titre="Invitations en attente"
        vide="Aucune invitation en attente."
      >
        {enCours.map((i) => (
          <LigneInvitation
            key={i.id}
            invitation={i}
            maintenant={maintenant}
            onMessage={setMessage}
          />
        ))}
      </Section>

      {expirees.length > 0 ? (
        <Section titre="Invitations expirées">
          {expirees.map((i) => (
            <LigneInvitation
              key={i.id}
              invitation={i}
              maintenant={maintenant}
              onMessage={setMessage}
            />
          ))}
        </Section>
      ) : null}

      <Section titre="Membres actifs">
        {membres.map((m) => (
          <LigneMembre
            key={m.id}
            membre={m}
            moi={m.id === moiId}
            onMessage={setMessage}
          />
        ))}
      </Section>
    </div>
  );
}

// Heure courante, rafraîchie toutes les 30 secondes pour le temps restant.
function useMaintenant() {
  const [maintenant, setMaintenant] = useState(() => Date.now());
  useEffect(() => {
    const minuteur = setInterval(() => setMaintenant(Date.now()), 30_000);
    return () => clearInterval(minuteur);
  }, []);
  return maintenant;
}

function Section({
  titre,
  vide,
  children,
}: {
  titre: string;
  vide?: string;
  children: React.ReactNode[];
}) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold">{titre}</h2>
      {children.length === 0 && vide ? (
        <p className="text-sm text-taupe">{vide}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-ardoise/10">{children}</ul>
      )}
    </section>
  );
}

function FormulaireInvitation({
  onFini,
  onAnnuler,
}: {
  onFini: (texte: string) => void;
  onAnnuler: () => void;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("lecteur");
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, demarrer] = useTransition();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setErreur(null);
        demarrer(async () => {
          const r = await inviter(email, role);
          if (r.erreur) setErreur(r.erreur);
          else
            onFini(
              `Invitation envoyée à ${email.trim().toLowerCase()}. Elle est valable 15 minutes.`,
            );
        });
      }}
      className="flex flex-col gap-4 rounded-2xl border border-ardoise/15 p-5"
    >
      <h2 className="text-lg font-semibold">Inviter un membre</h2>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">E-mail</span>
        <input
          type="email"
          required
          autoComplete="off"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-xl border border-ardoise/25 px-4 py-3"
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Rôle</span>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as Role)}
          className="rounded-xl border border-ardoise/25 bg-white px-4 py-3"
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {LIBELLES_ROLE[r]}
            </option>
          ))}
        </select>
      </label>
      {erreur ? (
        <p role="alert" className="text-sm">
          {erreur}
        </p>
      ) : null}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onAnnuler}
          className="flex-1 rounded-xl border border-ardoise/25 py-3 font-medium"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={envoi}
          className="flex-[2] rounded-xl bg-ardoise py-3 font-semibold text-white disabled:opacity-60"
        >
          {envoi ? "Envoi…" : "Envoyer l’invitation"}
        </button>
      </div>
    </form>
  );
}

function LigneInvitation({
  invitation: i,
  maintenant,
  onMessage,
}: {
  invitation: Invitation;
  maintenant: number;
  onMessage: (m: { texte: string; erreur: boolean }) => void;
}) {
  const [menu, setMenu] = useState(false);
  const [enCours, demarrer] = useTransition();
  const restant = Math.min(
    15,
    Math.ceil((expireLe(i.envoyee_le) - maintenant) / 60_000),
  );
  const expiree = restant <= 0;

  const agir = (action: () => Promise<{ erreur?: string }>, succes: string) =>
    demarrer(async () => {
      setMenu(false);
      const r = await action();
      onMessage(
        r.erreur
          ? { texte: r.erreur, erreur: true }
          : { texte: succes, erreur: false },
      );
    });

  return (
    <li className="relative flex items-center gap-3 py-3">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate font-medium">{i.email}</span>
        <span className="text-sm text-taupe">
          {LIBELLES_ROLE[i.role]} ·{" "}
          {expiree ? "expirée" : `expire dans ${restant} min`}
        </span>
      </div>
      {expiree ? (
        <button
          type="button"
          disabled={enCours}
          onClick={() =>
            agir(() => renvoyer(i.id), `Invitation renvoyée à ${i.email}.`)
          }
          className="rounded-full border border-ardoise/25 px-3 py-1.5 text-sm font-medium disabled:opacity-50"
        >
          Renvoyer
        </button>
      ) : null}
      <button
        type="button"
        aria-label={`Options pour ${i.email}`}
        aria-expanded={menu}
        disabled={enCours}
        onClick={() => setMenu(!menu)}
        className="flex h-9 w-9 items-center justify-center rounded-full text-xl leading-none disabled:opacity-50"
      >
        ⋮
      </button>
      {menu ? (
        <div className="absolute top-12 right-0 z-10 rounded-xl border border-ardoise/15 bg-white p-1 shadow-lg">
          <button
            type="button"
            onClick={() =>
              agir(() => annuler(i.id), `Invitation de ${i.email} annulée.`)
            }
            className="rounded-lg px-4 py-2.5 text-left text-sm whitespace-nowrap"
          >
            Annuler l’invitation
          </button>
        </div>
      ) : null}
    </li>
  );
}

function LigneMembre({
  membre: m,
  moi,
  onMessage,
}: {
  membre: Membre;
  moi: boolean;
  onMessage: (m: { texte: string; erreur: boolean }) => void;
}) {
  const [role, setRole] = useState(m.role);
  const [enCours, demarrer] = useTransition();
  return (
    <li className="flex items-center gap-3 py-3">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate font-medium">
          {m.nom}
          {moi ? <span className="font-normal text-taupe"> (toi)</span> : null}
        </span>
        {m.nom !== m.email ? (
          <span className="truncate text-sm text-taupe">{m.email}</span>
        ) : null}
      </div>
      <select
        aria-label={`Rôle de ${m.nom}`}
        value={role}
        disabled={moi || enCours}
        onChange={(e) => {
          const nouveau = e.target.value as Role;
          const avant = role;
          setRole(nouveau);
          demarrer(async () => {
            const r = await changerRole(m.id, nouveau);
            if (r.erreur) {
              setRole(avant);
              onMessage({ texte: r.erreur, erreur: true });
            } else
              onMessage({
                texte: `${m.nom} est maintenant ${LIBELLES_ROLE[nouveau].toLowerCase()}.`,
                erreur: false,
              });
          });
        }}
        className="rounded-lg border border-ardoise/25 bg-white px-2 py-2 text-sm disabled:opacity-60"
      >
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {LIBELLES_ROLE[r]}
          </option>
        ))}
      </select>
    </li>
  );
}
