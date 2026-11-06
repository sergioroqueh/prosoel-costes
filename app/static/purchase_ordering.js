// La fecha real del pedido manda, no el orden de respuesta de la RPC ni de importación.
// Las fechas PostgreSQL llegan como YYYY-MM-DD. Los IDs desempatan compras del mismo día.
export function comparePurchasesNewestFirst(a, b) {
  const dateA = String(a?.order_date || "").slice(0, 10);
  const dateB = String(b?.order_date || "").slice(0, 10);
  return dateB.localeCompare(dateA)
    || (Number(b?.order_id) || 0) - (Number(a?.order_id) || 0)
    || (Number(b?.order_year) || 0) - (Number(a?.order_year) || 0)
    || (Number(b?.order_number) || 0) - (Number(a?.order_number) || 0)
    || (Number(b?.order_line_id) || 0) - (Number(a?.order_line_id) || 0);
}

export function sortPurchasesNewestFirst(rows) {
  return [...rows].sort(comparePurchasesNewestFirst);
}

export function latestPricedPurchase(rows) {
  const priced = rows.filter((row) =>
    row?.net_unit_price !== null
    && row?.net_unit_price !== undefined
    && Number.isFinite(Number(row.net_unit_price))
    && Number(row.net_unit_price) > 0
  );
  return sortPurchasesNewestFirst(priced)[0] || null;
}
