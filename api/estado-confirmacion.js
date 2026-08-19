async function fetchWithTimeout(url, options = {}, timeoutMs = 5000) {
  const controller = new AbortController(); const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{return await fetch(url,{...options,signal:controller.signal});} finally{clearTimeout(timer);}
}
export default async function handler(req,res){
  if(req.method!=="GET"){res.setHeader("Allow","GET");return res.status(405).json({error:"Método no permitido"});}
  const supabaseUrl=process.env.SUPABASE_URL, supabaseKey=process.env.SUPABASE_SECRET_KEY;
  const nombre=String(req.query?.nombre||"").trim().slice(0,160);
  if(!supabaseUrl||!supabaseKey)return res.status(500).json({error:"Falta configurar Supabase en Vercel"});
  if(!nombre)return res.status(400).json({error:"Falta el nombre"});
  try{
    const url=`${supabaseUrl}/rest/v1/confirmaciones?select=id,nombre,asistira,numero_asistentes,mensaje,created_at&nombre=eq.${encodeURIComponent(nombre)}&order=created_at.desc&limit=1`;
    const response=await fetchWithTimeout(url,{headers:{apikey:supabaseKey}},5000);
    const data=await response.json().catch(()=>[]);
    if(!response.ok)return res.status(500).json({error:"No se pudo consultar la confirmación"});
    res.setHeader("Cache-Control","no-store");
    return res.status(200).json({respondido:Array.isArray(data)&&data.length>0,confirmacion:Array.isArray(data)&&data.length?data[0]:null});
  }catch(e){console.error(e);return res.status(504).json({error:"La consulta tardó demasiado"});}
}
