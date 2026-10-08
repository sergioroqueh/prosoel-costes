-- V12: expose source and reviewed values separately in ordinary price histories.

 create or replace function public.historical_price_history_filtered_review(p_reference text,p_description text,p_supplier_id bigint default null,p_year integer default null,result_limit integer default 500)
 returns table(order_line_id bigint, order_id bigint, order_reference text, order_year integer, order_number integer, order_subnumber text, order_date date, supplier text, project text, quantity numeric, supplier_reference text, description_original text, pvp numeric, discount_raw text, net_unit_price numeric, total_price numeric, price_validation_status text, source_filename text,
   supplier_reference_source text,description_source text,
   line_excluded boolean,order_excluded boolean,line_review_reason text)
 language sql stable security invoker set search_path=''
 as $body$
 select h.*,l.supplier_reference_source,l.description_source,
   l.line_excluded,l.order_excluded,l.line_review_reason
 from public.historical_price_history_filtered(p_reference,p_description,p_supplier_id,p_year,result_limit) h
 join public.order_lines_effective l on l.id=h.order_line_id
 $body$;
 revoke all on function public.historical_price_history_filtered_review(text,text,bigint,integer,integer) from public,anon;
 grant execute on function public.historical_price_history_filtered_review(text,text,bigint,integer,integer) to authenticated;
 
 create or replace function public.reference_purchase_history_review(p_reference text,result_limit integer default 500)
 returns table(order_line_id bigint, order_id bigint, order_reference text, order_year integer, order_number integer, order_subnumber text, order_date date, supplier_id bigint, supplier text, project text, quantity numeric, supplier_reference text, description_original text, pvp numeric, discount_raw text, net_unit_price numeric, total_price numeric, price_validation_status text, source_filename text,
   supplier_reference_source text,description_source text,
   line_excluded boolean,order_excluded boolean,line_review_reason text)
 language sql stable security invoker set search_path=''
 as $body$
 select h.*,l.supplier_reference_source,l.description_source,
   l.line_excluded,l.order_excluded,l.line_review_reason
 from public.reference_purchase_history(p_reference,result_limit) h
 join public.order_lines_effective l on l.id=h.order_line_id
 $body$;
 revoke all on function public.reference_purchase_history_review(text,integer) from public,anon;
 grant execute on function public.reference_purchase_history_review(text,integer) to authenticated;
 
 create or replace function public.material_price_history_review(p_material_id bigint,result_limit integer default 200)
 returns table(order_line_id bigint, order_id bigint, order_reference text, order_year integer, order_number integer, order_subnumber text, order_date date, supplier text, project text, quantity numeric, supplier_reference text, description_original text, pvp numeric, discount_raw text, net_unit_price numeric, total_price numeric, price_validation_status text, source_filename text,
   supplier_reference_source text,description_source text,
   line_excluded boolean,order_excluded boolean,line_review_reason text)
 language sql stable security invoker set search_path=''
 as $body$
 select h.*,l.supplier_reference_source,l.description_source,
   l.line_excluded,l.order_excluded,l.line_review_reason
 from public.material_price_history(p_material_id,result_limit) h
 join public.order_lines_effective l on l.id=h.order_line_id
 $body$;
 revoke all on function public.material_price_history_review(bigint,integer) from public,anon;
 grant execute on function public.material_price_history_review(bigint,integer) to authenticated;
 