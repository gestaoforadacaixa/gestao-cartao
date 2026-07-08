import { useState, useEffect, useMemo, useCallback } from "react";

// ─── SUPABASE — projeto separado, exclusivo do Controle de Cartão ─────────────
const SUPA_URL = "https://ghzgtvdbckgzlwhywznh.supabase.co";
const SUPA_KEY = "sb_publishable_eKFdLBtaBKD2W6ZHSuJZMg_UN_rpZAu";
const CID = "veruska";
const H = { "Content-Type":"application/json","apikey":SUPA_KEY,"Authorization":`Bearer ${SUPA_KEY}`,"Prefer":"return=representation" };

async function sbGet(){try{const r=await fetch(`${SUPA_URL}/rest/v1/cartao_despesas?cliente_id=eq.${CID}&order=created_at.asc`,{headers:H});return r.ok?r.json():[];}catch{return[];}}
async function sbPost(body){try{const r=await fetch(`${SUPA_URL}/rest/v1/cartao_despesas`,{method:"POST",headers:H,body:JSON.stringify(body)});return r.ok?r.json():null;}catch{return null;}}
async function sbPatch(id,body){try{const r=await fetch(`${SUPA_URL}/rest/v1/cartao_despesas?id=eq.${id}`,{method:"PATCH",headers:{...H,"Prefer":"return=minimal"},body:JSON.stringify(body)});return r.ok;}catch{return false;}}
async function sbDelete(id){try{const r=await fetch(`${SUPA_URL}/rest/v1/cartao_despesas?id=eq.${id}`,{method:"DELETE",headers:H});return r.ok;}catch{return false;}}

const uid = () => (crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)+Date.now());
const fmt = cents => (cents/100).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2});
const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const monthKey = (y,m) => `${y}-${String(m).padStart(2,"0")}`;
const todayMonthKey = () => { const d=new Date(); return monthKey(d.getFullYear(), d.getMonth()+1); };
const monthLabel = key => { const [y,m]=key.split("-").map(Number); return `${MESES[m-1]} ${y}`; };
function addMonths(key,n){
  let [y,m]=key.split("-").map(Number);
  m+=n; while(m>12){m-=12;y++;} while(m<1){m+=12;y--;}
  return monthKey(y,m);
}
function monthDiff(fromKey,toKey){
  const [fy,fm]=fromKey.split("-").map(Number);
  const [ty,tm]=toKey.split("-").map(Number);
  return (ty*12+tm)-(fy*12+fm);
}
// Divide o total (em centavos) em N parcelas; diferença de arredondamento
// fica inteira na ÚLTIMA parcela, garantindo que a soma bate exatamente.
function calcParcelas(valorTotalCents, parcelas){
  const base = Math.floor(valorTotalCents/parcelas);
  const resto = valorTotalCents - base*parcelas;
  const arr = new Array(parcelas).fill(base);
  arr[parcelas-1] += resto;
  return arr;
}
const d2cents = digits => parseInt(digits||"0",10);
const centsToDigits = cents => String(Math.round(cents));
const digitsToBRL = digits => { const n=parseInt(digits||"0",10); return `${Math.floor(n/100).toLocaleString("pt-BR")},${String(n%100).padStart(2,"0")}`; };
const reaisToCents = v => Math.round(parseFloat(v)*100);

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;0,9..144,700;1,9..144,500&family=IBM+Plex+Mono:wght@400;500;600&family=Inter:wght@400;500;600;700&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body{
  min-height:100vh;
  background:
    radial-gradient(ellipse 900px 500px at 15% -10%, rgba(201,165,102,0.06), transparent 60%),
    radial-gradient(ellipse 700px 500px at 100% 10%, rgba(90,110,180,0.07), transparent 55%),
    #0B0E17;
  color:#8E93AC; font-family:'Inter',sans-serif; -webkit-font-smoothing:antialiased;
}
.inp{width:100%;border:1.5px solid #E4DBC3;background:#FFFEFA;color:#1C1A12;border-radius:10px;padding:12px 13px;font-family:'Inter',sans-serif;font-size:15px;outline:none;transition:border-color .18s;-webkit-appearance:none;appearance:none}
.inp:focus{border-color:#8A7440}
.inp-err{border-color:#A8412F!important}
.btn{width:100%;border:none;border-radius:12px;padding:15px;font-family:'Inter',sans-serif;font-weight:700;font-size:14px;letter-spacing:.02em;cursor:pointer;transition:all .18s}
.btn-primary{background:#12162A;color:#E8CD8E}.btn-primary:hover{background:#1E2540}.btn-primary:disabled{opacity:.5;cursor:not-allowed}
.btn-danger{background:none;border:1.5px solid #A8412F;color:#A8412F;margin-top:10px}.btn-danger:hover{background:#A8412F;color:#fff}
.btn-ghost{background:none;border:1.5px solid #E4DBC3;color:#8A8368;margin-top:10px}.btn-ghost:hover{border-color:#8A8368;color:#1C1A12}
.fab{position:fixed;bottom:26px;left:50%;transform:translateX(-50%);background:linear-gradient(150deg,#E8CD8E,#C9A566);color:#0B0E17;border:none;border-radius:50px;padding:15px 26px;font-family:'Inter',sans-serif;font-weight:700;font-size:13.5px;letter-spacing:.03em;cursor:pointer;display:flex;align-items:center;gap:8px;box-shadow:0 10px 28px -6px rgba(201,165,102,.5);z-index:80;transition:transform .18s}
.fab:hover{transform:translateX(-50%) translateY(-2px)}.fab:active{transform:translateX(-50%) scale(.97)}
.overlay{position:fixed;inset:0;background:rgba(8,9,15,.72);backdrop-filter:blur(3px);z-index:200;display:flex;align-items:flex-end;justify-content:center;animation:fadeIn .2s ease}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
.sheet{background:#F6F1E4;color:#1C1A12;width:100%;max-width:460px;border-radius:20px 20px 0 0;padding:10px 22px 30px;max-height:90vh;overflow-y:auto;animation:sheetUp .28s cubic-bezier(.32,.72,0,1);box-shadow:0 -20px 60px rgba(0,0,0,.4);margin:0 auto}
@keyframes sheetUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
.handle{width:38px;height:4px;background:#E4DBC3;border-radius:2px;margin:10px auto 20px}
.icon-btn{width:28px;height:28px;border-radius:8px;border:1px solid rgba(201,165,102,.14);background:none;color:#5B6082;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s;flex-shrink:0}
.icon-btn:hover{border-color:#C9A566;color:#C9A566}
.icon-btn.danger:hover{border-color:#C65742;color:#C65742}
.item:hover{border-color:rgba(201,165,102,.3)!important;background:rgba(255,255,255,.035)!important}
.month-btn{background:none;border:1px solid rgba(201,165,102,.14);color:#C9A566;width:34px;height:34px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .18s}
.month-btn:hover{border-color:#C9A566;background:rgba(201,165,102,.08)}
.month-btn:active{transform:scale(.93)}
.spin{display:inline-block;width:12px;height:12px;border:2px solid rgba(201,165,102,.2);border-top-color:#C9A566;border-radius:50%;animation:spin .7s linear infinite;vertical-align:middle}
@keyframes spin{to{transform:rotate(360deg)}}
::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:#C9A566;border-radius:2px}
`;

function Chip(){
  return (
    <div style={{width:42,height:32,borderRadius:6,background:"linear-gradient(155deg,#E8CD8E,#C9A566 55%,#8A7440)",position:"relative",boxShadow:"0 2px 6px rgba(0,0,0,.35)"}}>
      <div style={{position:"absolute",inset:5,background:"repeating-linear-gradient(90deg,transparent 0 3px,rgba(20,16,4,.3) 3px 4px),repeating-linear-gradient(0deg,transparent 0 5px,rgba(20,16,4,.22) 5px 6px)",borderRadius:2}}/>
    </div>
  );
}

function CriarLogo({size=34}){
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <circle cx="50" cy="50" r="50" fill="white"/>
      {[{color:"#E67E22",rot:0},{color:"#8E44AD",rot:-72},{color:"#2980B9",rot:72},{color:"#27AE60",rot:-144},{color:"#E91E8C",rot:144}].map(({color,rot},i)=>(
        <g key={i} transform={`rotate(${rot} 50 50)`}>
          <ellipse cx="50" cy="24" rx="9" ry="13" fill={color}/>
          <ellipse cx="43" cy="14" rx="2.2" ry="5" fill={color} transform="rotate(-15 43 14)"/>
          <ellipse cx="47" cy="12" rx="2.2" ry="5" fill={color} transform="rotate(-5 47 12)"/>
          <ellipse cx="51" cy="12" rx="2.2" ry="5" fill={color} transform="rotate(5 51 12)"/>
          <ellipse cx="55" cy="13" rx="2.2" ry="5" fill={color} transform="rotate(15 55 13)"/>
        </g>
      ))}
      <text x="50" y="52" textAnchor="middle" fontFamily="Nunito,sans-serif" fontSize="9" fontWeight="900" fill="#1A5276" letterSpacing="2">CRIAR</text>
    </svg>
  );
}

function CardVisual({totalCents,count,holder}){
  return (
    <div style={{position:"relative",borderRadius:22,padding:"26px 24px 22px",minHeight:190,background:"radial-gradient(600px 200px at 15% 0%, rgba(201,165,102,.10), transparent 60%), linear-gradient(155deg, #232B4A 0%, #1A2038 46%, #12162A 100%)",border:"1px solid rgba(201,165,102,.16)",boxShadow:"0 24px 50px -18px rgba(0,0,0,.65), inset 0 1px 0 rgba(255,255,255,.04)",overflow:"hidden"}}>
      <div style={{position:"absolute",inset:0,pointerEvents:"none",opacity:.5,background:"repeating-linear-gradient(115deg, rgba(255,255,255,.015) 0px, rgba(255,255,255,.015) 1px, transparent 1px, transparent 7px)"}}/>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:30,position:"relative",zIndex:1}}>
        <Chip/>
        <div style={{display:"flex",alignItems:"center",gap:9}}>
          <div style={{textAlign:"right",lineHeight:1.35}}>
            <div style={{fontFamily:"'Inter',sans-serif",fontSize:8.5,letterSpacing:".22em",textTransform:"uppercase",color:"#6E93B8",fontWeight:600}}>Centro Educacional</div>
            <div style={{fontFamily:"'Fraunces',serif",fontSize:15,fontWeight:600,color:"#5AA4E8",letterSpacing:".02em"}}>CRIAR</div>
          </div>
          <CriarLogo size={34}/>
        </div>
      </div>
      <div style={{fontFamily:"'Inter',sans-serif",fontSize:10,letterSpacing:".22em",textTransform:"uppercase",color:"#5B6082",marginBottom:5,position:"relative",zIndex:1}}>Fatura do mês</div>
      <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:34,fontWeight:600,color:"#F6F1E4",letterSpacing:".01em",lineHeight:1,marginBottom:22,position:"relative",zIndex:1}}>
        <small style={{fontSize:16,color:"#C9A566",fontWeight:500}}>R$</small> {fmt(totalCents)}
      </div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",position:"relative",zIndex:1}}>
        <div>
          <div style={{fontFamily:"'Inter',sans-serif",fontSize:8.5,letterSpacing:".2em",textTransform:"uppercase",color:"#5B6082",marginBottom:4}}>Titular</div>
          <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:14.5,letterSpacing:".09em",textTransform:"uppercase",color:"#E8CD8E",textShadow:"0 1px 0 rgba(0,0,0,.6), 0 -1px 0 rgba(255,255,255,.08)"}}>{holder.toUpperCase()}</div>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:20,color:"#F6F1E4",fontWeight:600,lineHeight:1}}>{count}</div>
          <div style={{fontFamily:"'Inter',sans-serif",fontSize:8.5,letterSpacing:".18em",textTransform:"uppercase",color:"#5B6082",marginTop:3}}>parcelas ativas</div>
        </div>
      </div>
    </div>
  );
}

const emptyForm = (mesAtual) => ({descricao:"",pessoa:"Veruska",valorDigits:"",parcelas:"1",mesRef:mesAtual});

function FormSheet({mesAtual,item,onSaved,onClose}){
  const isEdit = !!item;
  const [form,setForm] = useState(()=> item
    ? {descricao:item.descricao,pessoa:item.pessoa||"Veruska",valorDigits:centsToDigits(reaisToCents(item.valor_total)),parcelas:String(item.parcelas),mesRef:item.mes_ref}
    : emptyForm(mesAtual)
  );
  const [err,setErr] = useState({});
  const [busy,setBusy] = useState(false);

  const parc = Math.max(1, parseInt(form.parcelas||"1",10));
  const cents = d2cents(form.valorDigits);
  const preview = useMemo(()=>{
    if(!cents || !parc) return null;
    const arr = calcParcelas(cents, parc);
    return arr;
  },[cents,parc]);

  function sf(k,v){ setForm(f=>({...f,[k]:v})); setErr(e=>({...e,[k]:false})); }

  async function salvar(){
    const e = {};
    if(!form.descricao.trim()) e.descricao = true;
    if(!cents || cents<=0) e.valor = true;
    if(!parc || parc<1) e.parcelas = true;
    if(!form.mesRef) e.mesRef = true;
    if(Object.keys(e).length){ setErr(e); return; }
    setBusy(true);
    const payload = {
      cliente_id: CID,
      descricao: form.descricao.trim(),
      pessoa: form.pessoa.trim() || "Veruska",
      valor_total: cents/100,
      parcelas: parc,
      mes_ref: form.mesRef,
    };
    let ok;
    if(isEdit){ ok = await sbPatch(item.id, payload); }
    else{ ok = await sbPost({ id: uid(), ...payload }); }
    setBusy(false);
    if(ok){ onSaved(); onClose(); }
    else setErr({geral:"Erro ao salvar."});
  }

  const LBL = {fontSize:10,color:"#8A8368",letterSpacing:".14em",textTransform:"uppercase",fontWeight:700,display:"block",marginBottom:7};

  return (
    <div className="overlay" onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div className="sheet">
        <div className="handle"/>
        <div style={{fontFamily:"'Fraunces',serif",fontSize:21,fontWeight:600,marginBottom:3}}>{isEdit?"Editar Despesa":"Nova Despesa"}</div>
        <div style={{fontFamily:"'Inter',sans-serif",fontSize:12,color:"#8A8368",marginBottom:20}}>{isEdit?"Ajuste os dados da compra parcelada.":"Compra no cartão para parcelar automaticamente."}</div>
        {err.geral && <div style={{background:"rgba(168,65,47,.06)",border:"1px solid rgba(168,65,47,.25)",borderRadius:10,padding:"12px 14px",marginBottom:16,fontSize:12.5,color:"#7A3527",fontWeight:600}}>{err.geral}</div>}

        <div style={{marginBottom:16}}>
          <label style={LBL}>Descrição *</label>
          <input className={`inp${err.descricao?" inp-err":""}`} placeholder="Ex: Material" value={form.descricao} onChange={e=>sf("descricao",e.target.value)}/>
        </div>
        <div style={{marginBottom:16}}>
          <label style={LBL}>Titular do Cartão</label>
          <input className="inp" placeholder="Veruska" value={form.pessoa} onChange={e=>sf("pessoa",e.target.value)}/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
          <div>
            <label style={LBL}>Valor Total *</label>
            <div style={{position:"relative"}}>
              <span style={{position:"absolute",left:13,top:"50%",transform:"translateY(-50%)",fontFamily:"'IBM Plex Mono',monospace",fontSize:14,color:"#8A8368",fontWeight:600}}>R$</span>
              <input className={`inp${err.valor?" inp-err":""}`} style={{paddingLeft:38,fontFamily:"'IBM Plex Mono',monospace",fontSize:18,fontWeight:600}} placeholder="0,00" inputMode="numeric"
                value={form.valorDigits?digitsToBRL(form.valorDigits):""}
                onChange={e=>sf("valorDigits",e.target.value.replace(/\D/g,""))}/>
            </div>
          </div>
          <div>
            <label style={LBL}>Parcelas *</label>
            <input className={`inp${err.parcelas?" inp-err":""}`} type="number" min="1" inputMode="numeric" value={form.parcelas} onChange={e=>sf("parcelas",e.target.value)}/>
          </div>
        </div>
        <div style={{marginBottom:16}}>
          <label style={LBL}>Mês da 1ª Parcela</label>
          <input className={`inp${err.mesRef?" inp-err":""}`} type="month" value={form.mesRef} onChange={e=>sf("mesRef",e.target.value)}/>
        </div>

        {preview && (
          <div style={{background:"rgba(201,165,102,.08)",border:"1px solid rgba(201,165,102,.25)",borderRadius:10,padding:"12px 14px",marginBottom:18,fontFamily:"'IBM Plex Mono',monospace",fontSize:12.5,color:"#6B5F35"}}>
            {parc}x de <b style={{color:"#1C1A12"}}>R$ {fmt(preview[0])}</b>
            {parc>1 && <> · última parcela <b style={{color:"#1C1A12"}}>R$ {fmt(preview[preview.length-1])}</b></>}
          </div>
        )}

        <button className="btn btn-primary" onClick={salvar} disabled={busy}>{busy?<><span className="spin"/> Salvando</>:(isEdit?"Salvar Alterações":"Registrar Despesa")}</button>
        <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
      </div>
    </div>
  );
}

function DelSheet({item,onDone,onClose}){
  const [busy,setBusy] = useState(false);
  const arr = calcParcelas(reaisToCents(item.valor_total), item.parcelas);
  async function confirmar(){
    setBusy(true);
    const ok = await sbDelete(item.id);
    setBusy(false);
    if(ok){ onDone(); onClose(); }
  }
  return (
    <div className="overlay" onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div className="sheet">
        <div className="handle"/>
        <div style={{fontFamily:"'Fraunces',serif",fontSize:21,fontWeight:600,color:"#A8412F",marginBottom:6}}>Excluir Despesa</div>
        <div style={{fontFamily:"'Inter',sans-serif",fontSize:12,color:"#8A8368",marginBottom:16}}>{item.descricao} · {item.parcelas}x de R$ {fmt(arr[0])}</div>
        <div style={{background:"rgba(168,65,47,.06)",border:"1px solid rgba(168,65,47,.25)",borderRadius:10,padding:"13px 15px",marginBottom:18,fontSize:12.5,color:"#7A3527",fontFamily:"'Inter',sans-serif"}}>
          Todas as parcelas desta despesa serão removidas do extrato, incluindo meses futuros já lançados.
        </div>
        <button className="btn btn-danger" onClick={confirmar} disabled={busy}>{busy?<><span className="spin"/> Excluindo</>:"Confirmar Exclusão"}</button>
        <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
      </div>
    </div>
  );
}

export default function App(){
  const [despesas,setDespesas] = useState([]);
  const [loading,setLoading] = useState(true);
  const [lastSync,setLastSync] = useState(null);
  const [currentMonth,setCurrentMonth] = useState(todayMonthKey());
  const [showForm,setShowForm] = useState(false);
  const [editItem,setEditItem] = useState(null);
  const [delItem,setDelItem] = useState(null);

  const load = useCallback(async (silent=false) => {
    if(!silent) setLoading(true);
    const d = await sbGet();
    setDespesas(d||[]);
    setLastSync(new Date());
    if(!silent) setLoading(false);
  },[]);

  useEffect(()=>{ load(); },[load]);
  useEffect(()=>{
    if(showForm||editItem||delItem) return;
    const t = setInterval(()=>load(true), 5000);
    return ()=>clearInterval(t);
  },[load,showForm,editItem,delItem]);

  const ativos = useMemo(()=>{
    const out = [];
    for(const d of despesas){
      const diff = monthDiff(d.mes_ref, currentMonth);
      if(diff>=0 && diff<d.parcelas){
        const arr = calcParcelas(reaisToCents(d.valor_total), d.parcelas);
        out.push({...d, parcelaIndex:diff+1, parcelaCents:arr[diff]});
      }
    }
    return out;
  },[despesas,currentMonth]);

  const totalCents = useMemo(()=>ativos.reduce((s,d)=>s+d.parcelaCents,0),[ativos]);
  const holder = ativos.length ? (ativos[0].pessoa||"Veruska") : (despesas.length ? (despesas[despesas.length-1].pessoa||"Veruska") : "Veruska");

  const anyModal = showForm || !!editItem || !!delItem;

  return (
    <div style={{fontFamily:"'Inter',sans-serif",minHeight:"100vh",maxWidth:480,margin:"0 auto",position:"relative",paddingBottom:120}}>
      <style>{CSS}</style>

      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"22px 20px 8px"}}>
        <div>
          <div style={{fontFamily:"'Inter',sans-serif",fontSize:9.5,letterSpacing:".28em",textTransform:"uppercase",color:"#8A7440",fontWeight:600}}>Extrato de Parcelas</div>
          <div style={{fontFamily:"'Fraunces',serif",fontSize:19,fontWeight:600,color:"#F6F1E4",letterSpacing:".01em"}}>Cartão de Crédito</div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:6,fontFamily:"'IBM Plex Mono',monospace",fontSize:9.5,letterSpacing:".06em",textTransform:"uppercase",color:loading?"#C9A566":"#7BAE8C",padding:"5px 10px",border:`1px solid ${loading?"rgba(201,165,102,.3)":"rgba(123,174,140,.22)"}`,borderRadius:20,background:"rgba(255,255,255,.02)"}}>
          <span style={{width:6,height:6,borderRadius:"50%",background:loading?"#C9A566":"#7BAE8C",flexShrink:0}}/>
          {loading?"sincronizando":"online"}
        </div>
      </div>

      <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:18,padding:"14px 20px 20px"}}>
        <button className="month-btn" onClick={()=>setCurrentMonth(m=>addMonths(m,-1))} aria-label="Mês anterior">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div style={{fontFamily:"'Fraunces',serif",fontSize:16,color:"#F6F1E4",letterSpacing:".03em",minWidth:150,textAlign:"center"}}>{monthLabel(currentMonth)}</div>
        <button className="month-btn" onClick={()=>setCurrentMonth(m=>addMonths(m,1))} aria-label="Próximo mês">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>

      <div style={{padding:"0 20px"}}>
        <CardVisual totalCents={totalCents} count={ativos.length} holder={holder}/>
      </div>

      <div style={{display:"flex",justifyContent:"center",gap:7,padding:"16px 20px 6px"}}>
        {Array.from({length:20}).map((_,i)=><span key={i} style={{width:5,height:5,borderRadius:"50%",background:"rgba(201,165,102,.18)",flexShrink:0}}/>)}
      </div>

      <div style={{fontFamily:"'Inter',sans-serif",fontSize:10,letterSpacing:".2em",textTransform:"uppercase",color:"#5B6082",padding:"14px 24px 10px",fontWeight:600}}>Lançamentos do mês</div>

      <div style={{padding:"0 20px",display:"flex",flexDirection:"column",gap:9}}>
        {loading && despesas.length===0 ? (
          <div style={{textAlign:"center",padding:"40px 0"}}><span className="spin"/></div>
        ) : ativos.length===0 ? (
          <div style={{textAlign:"center",padding:"44px 24px",color:"#5B6082"}}>
            <div style={{fontFamily:"'Fraunces',serif",fontSize:15,color:"#8E93AC",marginBottom:6,fontStyle:"italic"}}>Nenhuma parcela ativa neste mês</div>
            <div style={{fontFamily:"'Inter',sans-serif",fontSize:12}}>Toque em "Nova Despesa" para lançar uma compra parcelada.</div>
          </div>
        ) : ativos.map(d=>{
          const quitando = d.parcelaIndex===d.parcelas;
          return (
            <div key={d.id} className="item" style={{background:"rgba(255,255,255,.02)",border:"1px solid rgba(201,165,102,.14)",borderRadius:14,padding:"14px 16px",display:"flex",alignItems:"center",gap:12,transition:"border-color .18s, background .18s"}}>
              <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:11,fontWeight:600,color:quitando?"#7BAE8C":"#C9A566",background:quitando?"rgba(123,174,140,.1)":"rgba(201,165,102,.1)",border:`1px solid ${quitando?"rgba(123,174,140,.3)":"rgba(201,165,102,.25)"}`,borderRadius:20,padding:"4px 9px",flexShrink:0,whiteSpace:"nowrap"}}>
                {d.parcelaIndex}/{d.parcelas}{quitando?" · quita":""}
              </span>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontFamily:"'Inter',sans-serif",fontSize:14.5,fontWeight:600,color:"#F6F1E4",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{d.descricao}</div>
                <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:10.5,color:"#5B6082",marginTop:3}}>total {fmt(reaisToCents(d.valor_total))}</div>
              </div>
              <div style={{textAlign:"right",flexShrink:0}}>
                <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:15,fontWeight:600,color:"#E8CD8E",lineHeight:1.15}}>{fmt(d.parcelaCents)}</div>
                <div style={{fontFamily:"'Inter',sans-serif",fontSize:8.5,letterSpacing:".1em",textTransform:"uppercase",color:"#5B6082",marginTop:1}}>parcela</div>
              </div>
              <div style={{display:"flex",gap:6,flexShrink:0}}>
                <button className="icon-btn" onClick={()=>setEditItem(d)} title="Editar">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button className="icon-btn danger" onClick={()=>setDelItem(d)} title="Excluir">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {!anyModal && (
        <button className="fab" onClick={()=>setShowForm(true)}>
          <span style={{fontSize:18,lineHeight:1}}>+</span> Nova Despesa
        </button>
      )}

      {showForm && <FormSheet mesAtual={currentMonth} onSaved={load} onClose={()=>setShowForm(false)}/>}
      {editItem && <FormSheet mesAtual={currentMonth} item={editItem} onSaved={load} onClose={()=>setEditItem(null)}/>}
      {delItem && <DelSheet item={delItem} onDone={load} onClose={()=>setDelItem(null)}/>}
    </div>
  );
}
