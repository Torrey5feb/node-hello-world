const express = require('express');
  const cors = require('cors');
  const fetch = require('node-fetch');

  const app = express();
  const PORT = process.env.PORT || 3000;

  // Configurar CORS y parsear JSON
  app.use(cors());
  app.use(express.json());

  // Ruta para manejar las solicitudes a Tresguerras
  app.post('/cotizacion', async (req, res) => {
    console.log('Solicitud recibida con los siguientes datos:', req.body);

    // Validar que los campos necesarios están presentes
    const requiredFields = ['cp_origen', 'cp_destino', 'no_bultos_1', 'peso_1', 'valor_declarado'];
    const missingFields = requiredFields.filter(field => !req.body[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({ error: `Faltan los siguientes campos: ${missingFields.join(', ')}` });
    }

    try {
      const tresguerrasApiUrl = 'https://intranet.tresguerras.com.mx/WS/api/Customer/JSON/?action=ApiCotizacion';

      const requestData = {
        ...req.body,
        Access_Usr: 'API00162',
        Access_Pass: 'VVZaQ1NrMUVRWGhPYWtwRVZEQTFWVlZyUmxSU1kwOVNVVlZHUkZaR1RrSlRNRlph'
      };

      const response = await fetch(tresguerrasApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        throw new Error(`Error en la respuesta de Tresguerras: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Respuesta de Tresguerras:', data);

      if (data && data.return) {
        res.json({
          total: data.return.total || 0,
          dias_transito: data.return.dias_transito || 'N/A'
        });
      } else {
        res.status(500).json({ error: 'Respuesta inesperada de Tresguerras' });
      }
    } catch (error) {
      console.error('Error en el proxy:', error.message);
      res.status(500).json({ error: 'Error al conectar con Tresguerras' });
    }
  });

  app.listen(PORT, () => {
    console.log(`Servidor funcionando en http://localhost:${PORT}`);
  });
