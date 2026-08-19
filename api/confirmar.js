export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Método no permitido" });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: "Falta configurar Supabase en Vercel" });
  }

  const { nombre, asistira, numero_asistentes, mensaje } = req.body || {};

  const cleanName = String(nombre || "").trim().slice(0, 160);
  const cleanMessage = String(mensaje || "").trim().slice(0, 1500);
  const attends = Boolean(asistira);
  const people = attends
    ? Math.max(1, Math.min(10, Number(numero_asistentes) || 1))
    : 0;

  if (!cleanName) {
    return res.status(400).json({ error: "El nombre es obligatorio" });
  }

  try {
    // Insert directo. La restricción UNIQUE de Supabase evita duplicados.
    const response = await fetch(`${supabaseUrl}/rest/v1/confirmaciones`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": supabaseKey,
        "Prefer": "return=minimal"
      },
      body: JSON.stringify({
        nombre: cleanName,
        asistira: attends,
        numero_asistentes: people,
        mensaje: cleanMessage
      })
    });

    if (response.ok) {
      return res.status(200).json({ ok: true, alreadyConfirmed: false });
    }

    const raw = await response.text().catch(() => "");
    let data = null;
    try { data = raw ? JSON.parse(raw) : null; } catch {}

    // Si ya existía, para el invitado cuenta como confirmación correcta.
    if ((data && data.code === "23505") || raw.includes("23505") || raw.toLowerCase().includes("duplicate key")) {
      return res.status(200).json({ ok: true, alreadyConfirmed: true });
    }

    console.error("Supabase insert error:", raw);
    return res.status(500).json({ error: "No se pudo guardar la confirmación" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Error de conexión" });
  }
}
