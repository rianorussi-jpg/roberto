export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Método no permitido" });
  }

  const suppliedPassword = String(req.headers["x-admin-password"] || "");
  const adminPassword = process.env.CONFIRMADOS_PASSWORD;

  if (!adminPassword || suppliedPassword !== adminPassword) {
    return res.status(401).json({ error: "Contraseña incorrecta" });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: "Falta configurar Supabase en Vercel" });
  }

  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/confirmaciones?select=id,nombre,asistira,numero_asistentes,mensaje,created_at&order=created_at.desc`,
      {
        headers: {
          "apikey": supabaseKey
        }
      }
    );

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      console.error("Supabase select error:", data);
      return res.status(500).json({ error: "No se pudieron cargar las confirmaciones" });
    }

    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json(data);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Error de conexión" });
  }
}
