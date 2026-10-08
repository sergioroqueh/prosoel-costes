
-- V11 / revisión por familias: clasificación orientativa (nunca equivalencia)
alter table public.normalization_review_groups
 add column if not exists suggested_family text not null default 'sin_clasificar',
 add column if not exists family_signals jsonb not null default '[]'::jsonb,
 add column if not exists technical_alerts jsonb not null default '{}'::jsonb,
 add column if not exists evidence_refreshed_at timestamptz;

create or replace function private.review_guess_family(p_description text)
returns text
language sql immutable
set search_path=''
as $$
select case
 when upper(coalesce(p_description,'')) ~ 'MAGNETOT|DIFERENCIAL|DISYUNTOR|CONTACTOR|GUARDAMOTOR|SOBRETENSI[OÓ]N|AUTOM[AÁ]TICO|INTERRUPTOR AUT|INTERRUPTOR AUTOM|TX3[[:space:]]*[0-9]|IC60|IK60'
   then 'aparamanta'
 when upper(coalesce(p_description,'')) ~ 'H07Z1|H07V|RZ1|RV[- ]?K|ES07Z|CABLE|MANGUERA EL[EÉ]CTR|CONDUCTOR EL[EÉ]CTR|UTP|FIBRA [OÓ]PTICA|CAT[.]?[[:space:]]*[567]'
   then 'cables'
 when upper(coalesce(p_description,'')) ~ 'LUMINARIA|LUM[.]?[[:space:]]|DOWNLIGHT|APL(IQUE|IQUE LED)|PLAF[OÓ]N|FOCO LED|PANTALLA LED|PANTALLA ESTANCA|FAROLA|BALIZA LED|PROYECTOR LED|TIRA LED|L[AÁ]MPARA LED|BOMBILLA LED|EMERGENCIA LED'
   then 'iluminacion'
 when upper(coalesce(p_description,'')) ~ 'TUBO|CORRUGAD|CANALIZACI[OÓ]N|CANALETA|BANDEJA|CONDUCTO|RIGID|R[IÍ]GID|AISCAN'
   then 'canalizaciones'
 when upper(coalesce(p_description,'')) ~ 'SCHUKO|ENCHUFE|CONMUTADOR|CRUZAMIENTO|MECANISMO|TECLA|BASE DOBLE|MARCO SIMPLE|MARCO DOBLE|PULSADOR|BASE DE CORRIENTE|TOMA RJ45|TOMA TV'
   then 'mecanismos'
 when upper(coalesce(p_description,'')) ~ 'ANTENA|REPARTIDOR|VIDEOPORTERO|PORTERO ELECT|MONITOR DUOX|RACK|SPLITTER|LATIGUILLO|RECEPTOR [OÓ]PTICO|MULTIPLEXOR|CONECTOR SC/APC'
   then 'telecomunicaciones'
 when upper(coalesce(p_description,'')) ~ 'ARMARIO|ENVOLVENTE|CAJA|CUADRO EL[EÉ]CTR|ARQUETA|REGISTRO FINAL|COFRET'
   then 'envolventes_cajas'
 when upper(coalesce(p_description,'')) ~ 'PICA DE TIERRA|COBRE DESNUDO|PUESTA A TIERRA|RED EQUIPOTENCIAL'
   then 'puesta_tierra'
 when upper(coalesce(p_description,'')) ~ 'BRIDA|ABRAZADERA|TORNILLO|GRAPA|TACO [0-9]|FIJACI[OÓ]N'
   then 'fijaciones'
 else 'sin_clasificar'
end;
$$;
revoke all on function private.review_guess_family(text) from public,anon,authenticated;
