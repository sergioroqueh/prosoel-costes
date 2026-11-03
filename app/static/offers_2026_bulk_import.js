// Recuperación puntual desde el informe generado tras revisar los Excel originales.
// Solo envía referencias y hashes; no envía ZIP ni XLSX ni modifica compras.
export function initOffer2026BatchImport({client, isAdmin}) {
  const input = document.getElementById("offer2026BatchFile");
  const preview = document.getElementById("offer2026BatchPreview");
  const status = document.getElementById("offer2026BatchStatus");
  const ack = document.getElementById("offer2026BatchConfirm");
  const submit = document.getElementById("offer2026BatchSubmit");
  if (!input || !preview || !status || !ack || !submit) return null;
  let items = [];
  let applying = false;
  const updateButton = () => {
    submit.disabled = applying || !isAdmin() || !ack.checked || !items.length;
  };
  const clear = () => {
    items = [];
    ack.checked = false;
    preview.textContent = "";
    updateButton();
  };

  input.addEventListener("change", async () => {
    clear();
    const file = input.files?.[0];
    if (!file) {
      status.textContent = "Selecciona el JSON de ofertas auditadas.";
      return;
    }
    if (!isAdmin() || file.size > 8 * 1024 * 1024 || !/\.json$/i.test(file.name)) {
      status.textContent = "Archivo no admitido o sin permisos de administrador.";
      return;
    }
    status.textContent = "Validando la estructura del lote (sin enviar datos)…";
    try {
      const result = JSON.parse(await file.text());
      if (result?.schema !== "prosoel_supplier_offer_references_2026_v1" ||
          result?.scope !== "2026" || !Array.isArray(result.items) ||
          result.items.length < 1 || result.items.length > 1000) {
        throw new Error("El archivo no es un lote de referencias 2026 compatible.");
      }
      for (const item of result.items) {
        if (!/^[a-f0-9]{64}$/i.test(item.source_sha256 || "") ||
            typeof item.source_filename !== "string" ||
            item.source_filename.length > 350 ||
            !Array.isArray(item.references) || !item.references.length ||
            item.references.length > 16 ||
            item.references.some(ref =>
              typeof ref.reference !== "string" || ref.reference.length > 64 ||
              ref.source_cell !== "D4" ||
              typeof ref.source_text !== "string" || ref.source_text.length > 2000)) {
          throw new Error("Uno o más registros contienen datos incompletos o inconsistentes.");
        }
      }
      items = result.items;
      const references = items.reduce((sum, item) => sum + item.references.length, 0);
      preview.textContent = items.length + " Excel candidatos · " + references +
        " referencias de oferta · Verificación final por SHA-256 y nombre en Supabase.";
      status.textContent = "Lote válido para cotejo. No se ha escrito ningún dato.";
    } catch(error) {
      status.textContent = "No se pudo validar el archivo: " + String(error?.message || error);
      clear();
    }
    updateButton();
  });

  ack.addEventListener("change", updateButton);
  submit.addEventListener("click", async () => {
    if (!isAdmin() || applying || !ack.checked || !items.length) return;
    applying = true;
    updateButton();
    const totals = {matched:0,inserted:0,existing:0,unmatched:0,rejected:0};
    try {
      for (let i=0; i<items.length; i+=50) {
        status.textContent = "Verificando y guardando lote " +
          (Math.floor(i/50)+1) + " de " + Math.ceil(items.length/50) + "…";
        const {data,error} = await client.rpc("record_2026_supplier_offer_references", {
          p_items: items.slice(i,i+50),
        });
        if (error) throw error;
        totals.matched += Number(data?.files_matched||0);
        totals.inserted += Number(data?.references_inserted||0);
        totals.existing += Number(data?.references_existing||0);
        totals.unmatched += Number(data?.unmatched_files||0);
        totals.rejected += Number(data?.rejected_records||0);
      }
      status.textContent = "Cotejo finalizado: " + totals.matched +
        " archivos vinculados por SHA exacto, " + totals.inserted +
        " referencias añadidas, " + totals.existing + " ya existentes, " +
        totals.unmatched + " Excel sin coincidencia, " + totals.rejected +
        " referencias descartadas. No se han modificado pedidos ni precios.";
      ack.checked = false;
      updateButton();
    } catch(error) {
      status.textContent = "Importación detenida. Guardadas hasta este punto: " +
        totals.inserted + " referencias. Error: " + String(error?.message||error) +
        ". Se puede reintentar el mismo lote sin duplicados.";
      ack.checked = false;
    } finally {
      applying = false;
      updateButton();
    }
  });
  return { reset: clear };
}
