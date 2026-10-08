
create or replace function private.reconcile_review_reference(p_reference text)
returns void language plpgsql security definer set search_path=''
as $fn$
declare
 k text := upper(regexp_replace(btrim(coalesce(p_reference,'')),'[[:space:]]+','','g'));
 agg record;
begin
 if length(k)<3 or length(k)>64 then return; end if;
 select min(l.supplier_reference) ref,max(l.description_original) description,
  count(distinct o.supplier_id)::integer suppliers,
  count(distinct l.order_id)::integer orders,
  count(*)::integer lines,
  count(distinct regexp_replace(upper(l.description_original),'[[:space:]]+',' ','g'))::integer descriptions,
  count(distinct replace((regexp_match(lower(l.description_original),
    '([0-9]+([,.][0-9]+)?)[[:space:]]*w([^[:alpha:]]|$)'))[1],',','.'))::integer watts,
  max(o.order_date) latest
 into agg
 from public.order_lines_effective l
 join public.orders o on o.id=l.order_id
 where l.usable_for_prices
  and l.line_kind not in ('environmental_fee','freight','service')
  and l.supplier_reference is not null
  and upper(regexp_replace(btrim(l.supplier_reference),'[[:space:]]+','','g'))=k;
 if agg.lines is null or agg.lines=0
   or not (agg.suppliers>1 or (agg.descriptions>1 and agg.lines>=2)) then
   update public.normalization_review_groups
      set candidate_active=false,refreshed_at=now()
     where reference_key=k and candidate_active;
   return;
 end if;
 insert into public.normalization_review_groups as g
 (reference_key,observed_reference,sample_description,supplier_count,purchase_count,
  line_count,description_count,distinct_wattages,latest_order_date,priority_score,risk_level,candidate_active)
 values (k,agg.ref,agg.description,agg.suppliers,agg.orders,agg.lines,agg.descriptions,
   agg.watts,agg.latest,
   (case when agg.watts>1 then 100000 else 0 end
    +least(agg.suppliers,10)*1000+least(agg.orders,100)*10+least(agg.descriptions,100))::integer,
   (case when agg.watts>1 then 'technical_conflict'
         when agg.descriptions>1 then 'variant_descriptions'
         else 'cross_supplier' end),true)
 on conflict(reference_key) do update set
   observed_reference=excluded.observed_reference,
   sample_description=excluded.sample_description,
   supplier_count=excluded.supplier_count,
   purchase_count=excluded.purchase_count,
   line_count=excluded.line_count,
   description_count=excluded.description_count,
   distinct_wattages=excluded.distinct_wattages,
   latest_order_date=excluded.latest_order_date,
   priority_score=excluded.priority_score,
   risk_level=excluded.risk_level,
   candidate_active=true,
   refreshed_at=now();
 perform private.rebuild_review_evidence(k);
end;
$fn$;
revoke all on function private.reconcile_review_reference(text) from public,anon,authenticated;
