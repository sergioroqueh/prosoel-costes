// Aprende REBT R6 · Utilidades de lectura y búsqueda sobre el corpus BOE.
export const REBT_TEXT_PATH = "./rebt_legal_text.json?v=20261117-r6";
export const normalizeTerm = (value) => String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("es").replace(/\s+/g," ").trim();
export const escapeText = (value) => String(value??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;");

export async function getBoeCorpus(fetcher = fetch) {
  const response = await fetcher(REBT_TEXT_PATH,{cache:"no-cache"});
  if (!response.ok) throw new Error("No se pudo descargar el texto consolidado del BOE ("+response.status+").");
  const corpus = await response.json();
  if(corpus?.source!=="BOE-A-2002-18099" || corpus?.readableBlocks!==81 || !corpus.blocks ||
     !corpus.blocks["N-ART-01"] || !corpus.blocks["N-ITC-52"]) {
    throw new Error("El archivo del reglamento está incompleto o no corresponde al REBT.");
  }
  return corpus;
}
export function createBoeIndex(corpus, units) {
  return units.map(item=>{
    const block=corpus.blocks[item.id];
    return {id:item.id,code:item.code,title:item.title,
      text:block?.text||"",folded:normalizeTerm([item.code,item.title,block?.text||""].join(" ")),
      textFolded:normalizeTerm(block?.text||"")};
  });
}
function literalAccentRegex(normalized) {
  const accent={a:"[aáàâä]",e:"[eéèêë]",i:"[iíìîï]",o:"[oóòôö]",u:"[uúùûü]",n:"[nñ]"};
  const special=new Set(["\\","^","$",".","|","?","*","+", "(",")","[","]","{","}"]);
  const literal=[...normalized].map(ch=>ch===" "?"\\s+":
    accent[ch]||(special.has(ch)?"\\"+ch:ch)).join("");
  return new RegExp(literal,"iu");
}
export function findBoeText(index, query, limit=81) {
  const needle=normalizeTerm(query);
  if(!needle) return [];
  const found=[];
  for(const row of index){
    const inTitle=normalizeTerm(row.code+" "+row.title).includes(needle);
    const offset=row.textFolded.indexOf(needle);
    if(offset<0&&!inTitle)continue;
    const hay=row.textFolded;
    let count=0,cursor=0;
    while(count<999&&needle.length&&cursor<hay.length){
      const position=hay.indexOf(needle,cursor);
      if(position===-1)break;
      count++;cursor=position+needle.length;
    }
    // Posiciones originales: la normalización puede alterar longitudes.
    const match=row.text.match(literalAccentRegex(needle));
    const sourcePosition=match?.index ?? offset;
    const exactLength=match?.[0]?.length ?? needle.length;
    const start=Math.max(0,sourcePosition-70),end=Math.min(row.text.length,sourcePosition+exactLength+110);
    const snippet=sourcePosition<0?"":(start?"…":"")+row.text.slice(start,end).trim()+(end<row.text.length?"…":"");
    found.push({id:row.id,code:row.code,title:row.title,count,fromTitle:inTitle,snippet});
  }
  found.sort((a,b)=>Number(b.fromTitle)-Number(a.fromTitle)||b.count-a.count||a.code.localeCompare(b.code,"es",{numeric:true}));
  return found.slice(0,limit);
}

// El texto HTML viene del generador oficial, que elimina etiquetas y atributos
// ajenos a la lista permitida. La búsqueda añade marcados DOM, nunca HTML de usuario.
export function highlightInElement(host, query, maximum=120) {
  const term=normalizeTerm(query);
  if(!term||!host)return 0;
  const doc=host.ownerDocument;
  const walker=doc.createTreeWalker(host,NodeFilter.SHOW_TEXT);
  const candidates=[];
  while(walker.nextNode()){
    const node=walker.currentNode;
    if(node.parentElement?.closest("mark,script,style"))continue;
    const original=node.textContent||"";
    if(normalizeTerm(original).includes(term))candidates.push(node);
  }
  let total=0;
  for(const node of candidates) {
    if(total>=maximum)break;
    const text=node.textContent||"";
    const folded=normalizeTerm(text);
    if(!folded.includes(term))continue;
    // Unicode decomposed accents map to source code points, preserving original.
    // This covers Spanish accents without losing readable source text.
    const foldWithOffsets=[];
    for(let i=0;i<text.length;i++){
      const character=text[i].normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("es");
      for(const ch of character)foldWithOffsets.push(i);
    }
    const foldedText=Array.from(text).map(ch=>ch.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("es")).join("");
    if(!foldedText.includes(term))continue;
    const frag=doc.createDocumentFragment();
    let start=0,at=0,changed=false;
    while(at<foldedText.length&&total<maximum){
      const idx=foldedText.indexOf(term,at);
      if(idx<0)break;
      const begin=foldWithOffsets[idx],finish=(foldWithOffsets[idx+term.length-1]??begin)+1;
      if(begin<start){at=idx+term.length;continue;}
      if(begin>start)frag.append(doc.createTextNode(text.slice(start,begin)));
      const mark=doc.createElement("mark");mark.className="rebt6-highlight";mark.textContent=text.slice(begin,finish);
      frag.append(mark);
      total++;changed=true;start=finish;at=idx+term.length;
    }
    if(!changed)continue;
    if(start<text.length)frag.append(doc.createTextNode(text.slice(start)));
    node.replaceWith(frag);
  }
  return total;
}
