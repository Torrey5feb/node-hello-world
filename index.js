  const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const TRESGUERRAS_API_URL = "https://intranet.tresguerras.com.mx/WS/api/Customer/JSON/?action=ApiCotizacion";
const ACCESS_USR = "API00162";
const ACCESS_PASS = "VVZaQ1NrMUVRWGhPYWtwRVZEQTFWVlZyUmxSU1kwOVNVVlZHUkZaR1RrSlRNRlph";

async function obtenerDatosProducto(modelo) {
  try {
    const response = await fetch("https://raw.githubusercontent.com/Torrey5feb/URLS/refs/heads/main/modelos.json", {
      timeout: 5000
    });
    if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
    const jsonData = await response.json();
    return jsonData.productos[modelo] || null;
  } catch (error) {
    console.error("Error al obtener el JSON de productos:", error);
    return null;
  }
}

app.post("/cotizacion", async (req, res) => {
  const { modelo, cp_destino } = req.body;

  if (!modelo || !cp_destino) {
    return res.status(400).json({ error: "Faltan datos: modelo del producto o código postal" });
  }

  const productoData = await obtenerDatosProducto(modelo);
  if (!productoData) {
    return res.status(404).json({ error: "Modelo no encontrado en la base de datos" });
  }

  const requestData = {
    Access_Usr: ACCESS_USR,
    Access_Pass: ACCESS_PASS,
    cp_origen: "76159",
    cp_destino: cp_destino,
    no_bultos_1: "1",
    contenido_1: productoData.nombre || "Producto sin nombre",
    peso_1: String(productoData.peso || 1),
    alto_1: String(productoData.alto || 0.1),
    largo_1: String(productoData.largo || 0.1),
    ancho_1: String(productoData.ancho || 0.1),
    bandera_recoleccion: "S",
    bandera_ead: "S",
    retencion_iva_cliente: "N",
    valor_declarado: String(productoData.precio || 1000),
    referencia: `cotizaprod_${Date.now()}`,
    colonia_rem: "DESCONOCIDA",
    colonia_des: "DESCONOCIDA"
  };

  try {
    const response = await fetch(TRESGUERRAS_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestData),
      timeout: 10000
    });

    if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
    const data = await response.json();

    if (data.return) {
      if (data.return.error) {
        return res.status(400).json({
          error: data.return.error,
          descripcion_error: data.return.descripcion_error
        });
      }
      res.json({
        total: data.return.total || "0",
        dias_transito: data.return.dias_transito || "N/A"
      });
    } else {
      res.status(500).json({ error: "Respuesta inesperada de Tresguerras" });
    }
  } catch (error) {
    console.error("Error al conectar con Tresguerras:", error);
    res.status(500).json({ error: "Error al conectar con Tresguerras", details: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor funcionando en http://localhost:${PORT}`);
});
