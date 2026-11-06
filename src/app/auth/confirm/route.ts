import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { creerClientServeur } from "@/lib/supabase/serveur";

// Lien magique de l'e-mail de connexion : {{ .SiteURL }}/auth/confirm?token_hash=…&type=email
export async function GET(requete: NextRequest) {
  const { searchParams } = requete.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  if (tokenHash && type) {
    const supabase = await creerClientServeur();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(new URL("/", requete.url));
  }
  return NextResponse.redirect(new URL("/connexion?erreur=lien", requete.url));
}
