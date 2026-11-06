-- US-05 · Fonction appelée chaque jour par la tâche anti-pause (.github/workflows/anti-pause.yml).
-- Une vraie requête sur la base compte comme activité : le projet gratuit ne se met
-- pas en pause (après 7 jours d'inactivité). Elle ne renvoie aucune donnée de l'appli.

create function public.ping()
returns timestamptz
language sql
stable
set search_path = ''
as $$
  select now();
$$;

revoke execute on function public.ping() from public;
grant execute on function public.ping() to anon, authenticated;
