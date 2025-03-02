const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.urlencoded({ extended: true })); // Para procesar formularios
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

// Ruta para mostrar el formulario en el popup
app.get("/cotizar", (req, res) => {
  const modelo = req.query.modelo || "";
  if (!modelo) {
    return res.send("<h3>Error: No se proporcionó un modelo de producto.</h3>");
  }

  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Cotizar Envío</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; text-align: center; }
        input, button { margin: 5px; padding: 5px; }
        #resultado { margin-top: 10px; }
      </style>
    </head>
    <body>
      <h3>Cotizar Envío para ${modelo}</h3>
      <form method="POST" action="/cotizar">
        <input type="hidden" name="modelo" value="${modelo}">
        <label for="cp_destino">Código Postal:</label><br>
        <input type="text" id="cp_destino" name="cp_destino" maxlength="5" pattern="\\d{5}" required><br>
        <button type="submit">Calcular</button>
      </form>
      <div id="resultado"></div>
    </body>
    </html>
  `);
});

// Ruta para procesar el formulario y mostrar el resultado
app.post("/cotizar", async (req, res) => {
  const { modelo, cp_destino } = req.body;

  if (!modelo || !cp_destino) {
    return res.send("<h3>Error: Faltan datos (modelo o CP).</h3>");
  }

  const productoData = await obtenerDatosProducto(modelo);
  if (!productoData) {
    return res.send("<h3>Error: Modelo no encontrado en la base de datos.</h3>");
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

    if (data.return && !data.return.error) {
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Resultado del Envío</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; text-align: center; }
          </style>
        </head>
        <body>
          <h3>Resultado para ${modelo}</h3>
          <p>Costo de envío: $${data.return.total} MXN</p>
          <p>Días de tránsito: ${data.return.dias_transito}</p>
          <button onclick="window.close()">Cerrar</button>
        </body>
        </html>
      `);
    } else {
      res.send(`<h3>Error: ${data.return?.error || "Respuesta inesperada"}</h3><p>${data.return?.descripcion_error || ""}</p>`);
    }
  } catch (error) {
    console.error("Error al conectar con Tresguerras:", error);
    res.send(`<h3>Error al calcular el envío</h3><p>${error.message}</p>`);
  }
});

app.listen(PORT, () => {
  console.log(`Servidor funcionando en http://localhost:${PORT}`);
});
