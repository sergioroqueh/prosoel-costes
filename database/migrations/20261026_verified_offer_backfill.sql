-- PROSOEL-Costes: incorporación verificada de metadatos de oferta histórica.
-- Los Excel se examinan únicamente en el navegador. No se reciben ni almacenan.
-- Sin modificación de precios, líneas, cantidades, proveedores ni identidades.
CREATE TABLE IF NOT EXISTS public.order_offer_backfill_audit (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id bigint NOT NULL REFERENCES public.orders(id),
  source_sha256 char(64) NOT NULL,
  source_filename text NOT NULL,
  offer_reference text NOT NULL,
  offer_label text NOT NULL,
  updated_by text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT order_offer_backfill_once UNIQUE(order_id)
);
ALTER TABLE public.order_offer_backfill_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.order_offer_backfill_audit FROM public,anon,authenticated;
GRANT SELECT ON TABLE public.order_offer_backfill_audit TO authenticated;
DROP POLICY IF EXISTS order_offer_backfill_admin_select ON public.order_offer_backfill_audit;
CREATE POLICY order_offer_backfill_admin_select
ON public.order_offer_backfill_audit FOR SELECT TO authenticated
USING (EXISTS(
  SELECT 1 FROM public.app_users u
  WHERE lower(u.email) = lower(coalesce(auth.jwt()->>'email',''))
    AND u.active AND u.role='admin'
));

CREATE OR REPLACE FUNCTION private.apply_verified_order_offers(p_items jsonb)
RETURNS TABLE(order_id bigint, outcome text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $function$
DECLARE
  actor text := lower(coalesce(auth.jwt()->>'email',''));
  item jsonb;
  oid bigint;
  digest text;
  title text;
  offer text;
  label text;
  source public.orders%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.app_users u
    WHERE lower(u.email)=actor AND u.active AND u.role='admin'
  ) THEN RAISE EXCEPTION 'Solo administradores autorizados' USING ERRCODE='42501'; END IF;
  IF p_items IS NULL OR pg_catalog.jsonb_typeof(p_items)<>'array'
     OR pg_catalog.jsonb_array_length(p_items)<1
     OR pg_catalog.jsonb_array_length(p_items)>100
     OR pg_catalog.octet_length(p_items::text)>60000
  THEN RAISE EXCEPTION 'Lote inválido (1-100 ofertas, máximo 60 KB)'; END IF;
  FOR item IN SELECT value FROM pg_catalog.jsonb_array_elements(p_items) LOOP
    IF pg_catalog.jsonb_typeof(item)<>'object' OR coalesce(item->>'order_id','') !~ '^[0-9]{1,18}$'
    THEN RAISE EXCEPTION 'Identificador de pedido incorrecto'; END IF;
    oid := (item->>'order_id')::bigint;
    digest := lower(pg_catalog.btrim(coalesce(item->>'source_sha256','')));
    title := pg_catalog.btrim(coalesce(item->>'source_filename',''));
    offer := pg_catalog.btrim(coalesce(item->>'supplier_offer_reference',''));
    label := pg_catalog.btrim(coalesce(item->>'supplier_offer_label',''));
    IF digest !~ '^[0-9a-f]{64}$' OR title='' OR length(title)>240
      OR offer='' OR length(offer)>120 OR offer ~ '[[:cntrl:]]'
      OR label='' OR length(label)>120 OR label ~ '[[:cntrl:]]'
    THEN RAISE EXCEPTION 'Datos de oferta inválidos para el pedido %',oid; END IF;

    SELECT * INTO source FROM public.orders o WHERE o.id=oid FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Pedido inexistente %',oid; END IF;
    IF lower(pg_catalog.btrim(source.source_sha256))<>digest
      OR source.source_filename<>title
    THEN RAISE EXCEPTION 'No coincide la huella SHA-256 o el archivo original del pedido %',oid; END IF;
    IF source.supplier_offer_reference IS NOT NULL THEN
      IF source.supplier_offer_reference<>offer THEN
        RAISE EXCEPTION 'Conflicto: el pedido % ya tiene otra oferta registrada',oid;
      END IF;
      order_id := oid; outcome := 'already_present'; RETURN NEXT;
    ELSE
      UPDATE public.orders o
      SET supplier_offer_reference=offer,supplier_offer_label=label
      WHERE o.id=oid AND o.supplier_offer_reference IS NULL;
      INSERT INTO public.order_offer_backfill_audit
        (order_id,source_sha256,source_filename,offer_reference,offer_label,updated_by)
      VALUES (oid,digest,title,offer,label,actor);
      order_id := oid; outcome := 'updated'; RETURN NEXT;
    END IF;
  END LOOP;
END;
$function$;

REVOKE ALL ON FUNCTION private.apply_verified_order_offers(jsonb) FROM public,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.apply_verified_order_offers(jsonb) TO authenticated;

-- El RPC público conserva la identidad del usuario y delega en la función privada.
CREATE OR REPLACE FUNCTION public.apply_verified_order_offers(p_items jsonb)
RETURNS TABLE(order_id bigint, outcome text)
LANGUAGE sql VOLATILE SECURITY INVOKER SET search_path=''
AS $wrapper$
  SELECT * FROM private.apply_verified_order_offers(p_items);
$wrapper$;
REVOKE ALL ON FUNCTION public.apply_verified_order_offers(jsonb) FROM public,anon;
GRANT EXECUTE ON FUNCTION public.apply_verified_order_offers(jsonb) TO authenticated;
