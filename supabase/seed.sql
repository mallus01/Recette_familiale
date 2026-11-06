-- Valeurs d'exemple des listes fermées (indicatives, modifiables par l'admin).
insert into public.type_repas (nom) values ('Entrée'), ('Plat'), ('Dessert')
on conflict (nom) do nothing;

insert into public.occasion (nom) values ('Noël'), ('Nouvel An'), ('Anniversaire')
on conflict (nom) do nothing;
