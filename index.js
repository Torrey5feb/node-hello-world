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

  // Ruta para obtener datos del JSON de productos
  async function obtenerDatosProducto(modelo) {
    try {
      const response = await fetch("https://raw.githubusercontent.com/Torrey5feb/URLS/refs/heads/main/modelos.json");
      const jsonData = await response.json();

      if (jsonData.productos[modelo]) {
        return jsonData.productos[modelo];
      } else {
        return null;
      }
    } catch (error) {
      console.error("Error al obtener el JSON de productos:", error);
      return null;
    }
  }

  // Ruta para cotización de envío
  app.post("/cotizacion", async (req, res) => {
    const { modelo, cp_destino } = req.body;

    if (!modelo || !cp_destino) {
      return res.status(400).json({ error: "Faltan datos: modelo del producto o código postal" });
    }

    // Obtener datos del producto desde el JSON
    const productoData = await obtenerDatosProducto(modelo);
    if (!productoData) {
      return res.status(404).json({ error: "Modelo no encontrado en la base de datos" });
    }

    // Construcción del request para Tresguerras
    const requestData = {
      Access_Usr: ACCESS_USR,
      Access_Pass: ACCESS_PASS,
      cp_origen: "76159",
      cp_destino: cp_destino,
      no_bultos_1: "1",
      contenido_1: productoData.nombre || "Producto sin nombre",
      peso_1: productoData.peso || "1",
      alto_1: productoData.alto || "0.1",
      largo_1: productoData.largo || "0.1",
      ancho_1: productoData.ancho || "0.1",
      bandera_recoleccion: "S",
      bandera_ead: "S",
      retencion_iva_cliente: "N",
      valor_declarado: productoData.precio || "1000",
      referencia: "cotizaprod01"
    };

    try {
      const response = await fetch(TRESGUERRAS_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData)
      });

      const data = await response.json();

      if (data && data.return) {
        res.json({
          total: data.return.total || 0,
          dias_transito: data.return.dias_transito || "N/A"
        });
      } else {
        res.status(500).json({ error: "Respuesta inesperada de Tresguerras" });
      }
    } catch (error) {
      console.error("Error al conectar con Tresguerras:", error);
      res.status(500).json({ error: "Error al conectar con Tresguerras" });
    }
  });

  app.listen(PORT, () => {
    console.log(`Servidor funcionando en http://localhost:${PORT}`);
  });

