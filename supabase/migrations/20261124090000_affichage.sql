-- V4 · Sprint 12 : réglages d'affichage de chaque membre (US-56 et US-57).
-- Rejouable : peut être collée plusieurs fois dans SQL Editor sans erreur.
--
-- Taille du texte et contraste renforcé sont gardés avec le membre, donc identiques sur
-- tous ses appareils. Chaque appareil en garde aussi une copie, pour s'afficher sans délai.

alter table public.membre
  add column if not exists taille_texte text not null default 'normale',
  add column if not exists contraste_renforce boolean not null default false;

alter table public.membre drop constraint if exists membre_taille_texte_check;
alter table public.membre
  add constraint membre_taille_texte_check check (taille_texte in ('normale', 'grande', 'tres_grande'));

-- Le membre ne peut pas modifier sa fiche (réservé à l'admin) : il règle son affichage
-- par cette fonction, qui ne touche que ces deux colonnes.
create or replace function public.regler_affichage(p_taille text, p_contraste boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_taille not in ('normale', 'grande', 'tres_grande') then
    raise exception 'taille inconnue' using errcode = 'check_violation';
  end if;
  update public.membre
  set taille_texte = p_taille, contraste_renforce = coalesce(p_contraste, false)
  where id = auth.uid();
end;
$$;

revoke execute on function public.regler_affichage(text, boolean) from public, anon;
grant execute on function public.regler_affichage(text, boolean) to authenticated;
