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
    // Invitaciones personalizadas: una sola respuesta por invitado.
    // Hugo no puede volver a confirmar ni cambiar su respuesta desde el formulario.
    if (cleanName.toLowerCase() === "hugo capellini") {
      const checkResponse = await fetch(
        `${supabaseUrl}/rest/v1/confirmaciones?select=id&nombre=eq.${encodeURIComponent(cleanName)}&limit=1`,
        { headers: { "apikey": supabaseKey } }
      );
      const existing = await checkResponse.json().catch(() => []);
      if (checkResponse.ok && Array.isArray(existing) && existing.length > 0) {
        return res.status(409).json({ error: "Esta invitación ya fue respondida." });
      }
    }
    const response = await fetch(`${supabaseUrl}/rest/v1/confirmaciones`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": supabaseKey,
        "Prefer": "return=representation"
      },
      body: JSON.stringify({
        nombre: cleanName,
        asistira: attends,
        numero_asistentes: people,
        mensaje: cleanMessage
      })
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      console.error("Supabase insert error:", data);
      return res.status(500).json({ error: "No se pudo guardar la confirmación" });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Error de conexión" });
  }
}
