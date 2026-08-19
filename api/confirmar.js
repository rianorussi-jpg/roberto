async function fetchWithTimeout(url, options = {}, timeoutMs = 6000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try { return await fetch(url, { ...options, signal: controller.signal }); }
  finally { clearTimeout(timer); }
}

export default async function handler(req, res) {
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).json({ error: "Método no permitido" }); }
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !supabaseKey) return res.status(500).json({ error: "Falta configurar Supabase en Vercel" });
  const { nombre, asistira, numero_asistentes, mensaje } = req.body || {};
  const cleanName = String(nombre || "").trim().slice(0,160);
  const cleanMessage = String(mensaje || "").trim().slice(0,1500);
  const attends = Boolean(asistira);
  const people = attends ? Math.max(1, Math.min(10, Number(numero_asistentes)||1)) : 0;
  if (!cleanName) return res.status(400).json({ error: "El nombre es obligatorio" });
  try {
    const checkResponse = await fetchWithTimeout(`${supabaseUrl}/rest/v1/confirmaciones?select=id&nombre=eq.${encodeURIComponent(cleanName)}&limit=1`, {headers:{apikey:supabaseKey}}, 5000);
    const existing = await checkResponse.json().catch(()=>[]);
    if (checkResponse.ok && Array.isArray(existing) && existing.length) return res.status(200).json({ok:true,alreadyConfirmed:true});
    const response = await fetchWithTimeout(`${supabaseUrl}/rest/v1/confirmaciones`, {method:"POST",headers:{"Content-Type":"application/json",apikey:supabaseKey,Prefer:"return=minimal"},body:JSON.stringify({nombre:cleanName,asistira:attends,numero_asistentes:people,mensaje:cleanMessage})}, 6000);
    if (!response.ok) {
      const raw=await response.text().catch(()=>""); let data=null; try{data=raw?JSON.parse(raw):null}catch{}
      if ((data&&data.code==="23505") || raw.includes("23505")) return res.status(200).json({ok:true,alreadyConfirmed:true});
      return res.status(500).json({error:"No se pudo guardar la confirmación"});
    }
    return res.status(200).json({ok:true,alreadyConfirmed:false});
  } catch(e) { console.error(e); return res.status(504).json({error:"La confirmación tardó demasiado"}); }
}
