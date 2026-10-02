-- ROLES
create type public.app_role as enum ('admin', 'user');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "own profile select" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "own profile update" on public.profiles for update to authenticated using (auth.uid() = id);
create policy "own profile insert" on public.profiles for insert to authenticated with check (auth.uid() = id);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "own roles select" on public.user_roles for select to authenticated using (auth.uid() = user_id);

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.claim_admin()
returns boolean language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then return false; end if;
  if exists (select 1 from public.user_roles where role = 'admin') then
    return exists (select 1 from public.user_roles where role = 'admin' and user_id = uid);
  end if;
  insert into public.user_roles (user_id, role) values (uid, 'admin');
  return true;
end;
$$;
grant execute on function public.claim_admin() to authenticated;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- SUBSCRIPTIONS
create table public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  status text not null default 'active',
  plan text not null default 'premium',
  started_at timestamptz not null default now(),
  current_period_end timestamptz not null default (now() + interval '30 days'),
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.subscriptions to authenticated;
grant all on public.subscriptions to service_role;
alter table public.subscriptions enable row level security;
create policy "own subscription select" on public.subscriptions for select to authenticated using (auth.uid() = user_id);
create policy "own subscription insert" on public.subscriptions for insert to authenticated with check (auth.uid() = user_id);
create policy "own subscription update" on public.subscriptions for update to authenticated using (auth.uid() = user_id);
create policy "own subscription delete" on public.subscriptions for delete to authenticated using (auth.uid() = user_id);

create or replace function public.is_premium(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.subscriptions
    where user_id = _user_id and status = 'active' and current_period_end > now()
  )
$$;

-- ARTICLES (metadata is public, body lives in a separate, non-public table)
create table public.articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  excerpt text not null default '',
  preview text not null default '',
  category text not null default 'Pension',
  cover_image_url text,
  is_premium boolean not null default false,
  published boolean not null default false,
  published_at timestamptz,
  reading_minutes int not null default 5,
  author text not null default 'Pensionslyft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.articles to anon;
grant select, insert, update, delete on public.articles to authenticated;
grant all on public.articles to service_role;
alter table public.articles enable row level security;
create policy "published articles are public" on public.articles for select to anon using (published = true);
create policy "published articles readable" on public.articles for select to authenticated using (published = true or public.has_role(auth.uid(), 'admin'));
create policy "admins insert articles" on public.articles for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));
create policy "admins update articles" on public.articles for update to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "admins delete articles" on public.articles for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

create table public.article_bodies (
  article_id uuid primary key references public.articles(id) on delete cascade,
  body text not null default ''
);
grant select, insert, update, delete on public.article_bodies to authenticated;
grant all on public.article_bodies to service_role;
alter table public.article_bodies enable row level security;
create policy "admins read bodies" on public.article_bodies for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "admins write bodies" on public.article_bodies for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));
create policy "admins update bodies" on public.article_bodies for update to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "admins delete bodies" on public.article_bodies for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

-- SAVED CALCULATIONS
create table public.saved_calculations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  label text not null default 'Min beräkning',
  input jsonb not null default '{}'::jsonb,
  result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.saved_calculations to authenticated;
grant all on public.saved_calculations to service_role;
alter table public.saved_calculations enable row level security;
create policy "own calcs select" on public.saved_calculations for select to authenticated using (auth.uid() = user_id);
create policy "own calcs insert" on public.saved_calculations for insert to authenticated with check (auth.uid() = user_id);
create policy "own calcs delete" on public.saved_calculations for delete to authenticated using (auth.uid() = user_id);

-- SEED
insert into public.articles (slug, title, excerpt, preview, category, is_premium, published, published_at, reading_minutes) values
('sa-fungerar-din-allmanna-pension', 'Så fungerar din allmänna pension', 'En genomgång av inkomstpension, premiepension och garantipension – och vad som faktiskt styr din slutliga utbetalning.', 'Den allmänna pensionen är grunden i det svenska pensionssystemet. Varje år avsätts 18,5 procent av din pensionsgrundande inkomst, varav 16 procent går till inkomstpensionen och 2,5 procent till premiepensionen.', 'Grunderna', false, true, now() - interval '20 days', 7),
('tjanstepension-det-du-bor-veta', 'Tjänstepensionen – det du bör veta', 'Tjänstepensionen kan stå för en tredjedel av din pension. Här är avgifterna och valen som betyder mest.', 'Ungefär nio av tio anställda i Sverige har tjänstepension. Skillnaden mellan ett bra och ett dåligt val kan handla om hundratusentals kronor över ett arbetsliv.', 'Tjänstepension', false, true, now() - interval '12 days', 6),
('avgifter-som-ater-upp-din-pension', 'Avgifterna som äter upp din pension', 'En avgift på 1,2 procent låter lite. Över 35 år kan den kosta dig mer än en årslön.', 'Avgifter är den enda faktorn i ditt pensionssparande som du vet säkert på förhand. Avkastningen kan du inte styra – men avgiften kan du.', 'Premium', true, true, now() - interval '6 days', 9),
('uttagsstrategi-nar-pensionen-borjar', 'Uttagsstrategi: så tar du ut pengarna smartast', 'Livsvarigt eller på tio år? Ordningen du tar ut din pension i påverkar skatten mer än de flesta tror.', 'När sparandet är klart börjar den svåraste delen: att ta ut pengarna. Uttagstiden påverkar både skatten och hur länge pengarna räcker.', 'Premium', true, true, now() - interval '2 days', 11);

insert into public.article_bodies (article_id, body)
select id, case slug
  when 'sa-fungerar-din-allmanna-pension' then
'## Tre delar i en

Den allmänna pensionen består av inkomstpension, premiepension och – för den som haft låg eller ingen inkomst – garantipension.

### Inkomstpension
16 procent av din pensionsgrundande inkomst bokförs på ditt inkomstpensionskonto. Pengarna placeras inte på börsen utan räknas upp med inkomstindex, det vill säga löneutvecklingen i Sverige.

### Premiepension
2,5 procent placeras i fonder som du själv väljer. Gör du inget val hamnar pengarna i AP7 Såfa, som historiskt varit ett både billigt och starkt alternativ.

### Garantipension
Ett grundskydd för den som haft låg livsinkomst. Den trappas av mot inkomstpensionen.

## Vad du kan påverka

Tre saker styr storleken: hur mycket du tjänar, hur länge du arbetar och när du börjar ta ut pensionen. Ett års senare uttag ökar den livsvariga utbetalningen märkbart.'
  when 'tjanstepension-det-du-bor-veta' then
'## Varför tjänstepensionen är avgörande

För många motsvarar tjänstepensionen 25–35 procent av den totala pensionen. Den betalas av arbetsgivaren, men valen gör du själv.

## Tre val som betyder mest

1. **Fondval eller traditionell försäkring.** Fondförsäkring ger högre förväntad avkastning men större svängningar.
2. **Avgiften.** Skillnaden mellan 0,2 och 1,0 procent i årlig avgift är enorm över tid.
3. **Återbetalningsskydd.** Det ger efterlevande trygghet men sänker din egen pension.

## Byter du jobb?

Kontrollera alltid om den nya arbetsgivaren har kollektivavtal. Saknas tjänstepension bör du kompensera med eget sparande – ofta 4,5 procent av lönen som tumregel.'
  when 'avgifter-som-ater-upp-din-pension' then
'## Räkneexemplet som förändrar allt

Anta 500 000 kronor i kapital, 2 000 kronor i månadssparande, 35 år kvar och 7 procents avkastning före avgifter.

- Med 0,2 procent i avgift: cirka 8,9 miljoner kronor.
- Med 1,2 procent i avgift: cirka 7,0 miljoner kronor.

Skillnaden – nästan två miljoner kronor – är ren avgiftskostnad.

## Avgifter du bör leta efter

| Typ | Vad det är | Rimlig nivå |
| --- | --- | --- |
| Fondavgift | Förvaltningsavgift i fonden | 0,2–0,4 % för indexfond |
| Kapitalavgift | Försäkringsbolagets avgift på kapitalet | 0–0,3 % |
| Fast avgift | Kronor per år | 0–200 kr |

## Så sänker du dem

Flytta gamla pensionsförsäkringar till en billigare förvaltare, välj indexnära fonder i premiepensionen och samla ditt privata sparande i ISK med låg avgift. Använd vår ränta-på-ränta-kalkylator för att se effekten på just ditt sparande.'
  else
'## Livsvarigt eller tidsbegränsat

Ett tioårigt uttag ger högre månadsbelopp i början men riskerar att ta slut. Livsvarigt uttag ger trygghet men lägre belopp per månad.

## Skatten styr ordningen

Pension beskattas som inkomst. Tar du ut allmän pension, tjänstepension och privat pension samtidigt kan du hamna över gränsen för statlig inkomstskatt. Genom att sprida uttagen över fler år undviker du ofta den toppen.

## En tumregel i fyra steg

1. Skjut upp den allmänna pensionen så länge du kan leva på annat.
2. Ta ut tjänstepensionen över minst 15 år om du inte behöver pengarna direkt.
3. Använd ISK-kapital till toppar och engångsutgifter.
4. Räkna om planen vart tredje år.

## Jobbskatteavdraget efter 66

Fortsätter du arbeta efter det år du fyller 66 får du både förhöjt jobbskatteavdrag och högre grundavdrag. För många är ett extra arbetsår den enskilt mest lönsamma pensionsåtgärden.'
end from public.articles;