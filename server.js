const express = require("express")
const path = require("path")
const mysql = require("mysql2")
const https = require("https")

const app = express()
const port = 3001

app.use(express.static("public"))
app.use("/src/images", express.static(path.join(__dirname, "src/images")))
app.use(express.json())

const connection = mysql.createConnection({
  host: "brfdzxhpwrgaqtinktwt-mysql.services.clever-cloud.com",
  user: "utehhx9jfaw5szjk", 
  password: "fpoFCPnqc0zr9uhpgJxM",
  database: "brfdzxhpwrgaqtinktwt",
})

function checkInternetConnection() {
  return new Promise((resolve) => {
    https
      .get("https://www.google.com", (res) => {
        resolve(true)
        res.resume()
      })
      .on("error", () => {
        resolve(false)
      })
  })
}

async function measurePing() {
  const startTime = Date.now()
  try {
    await new Promise((resolve, reject) => {
      https
        .get("https://www.google.com", (res) => {
          res.resume()
          resolve()
        })
        .on("error", reject)
    })
    return Date.now() - startTime
  } catch {
    return 0
  }
}

app.post("/api/test-network", async (req, res) => {
  try {
    const isConnected = await checkInternetConnection()
    const currentDate = new Date()

    let testData = {
      fecha: currentDate,
      downloadSpeed: 0,
      uploadSpeed: 0,
      ping: 0,
      estado: "Incorrecta",
    }

    if (isConnected) {
      const ping = await measurePing()
      testData = {
        fecha: currentDate,
        downloadSpeed: Math.floor(Math.random() * (100 - 20) + 20), // Entre 20 y 100 Mbps
        uploadSpeed: Math.floor(Math.random() * (50 - 10) + 10), // Entre 10 y 50 Mbps
        ping: ping,
        estado: "Correcta",
      }
    }

    const query =
      "INSERT INTO pruebas_red (fecha, download_speed, upload_speed, ping, is_connected, estado) VALUES (?, ?, ?, ?, ?, ?)"
    connection.query(
      query,
      [testData.fecha, testData.downloadSpeed, testData.uploadSpeed, testData.ping, isConnected, testData.estado],
      (error, results) => {
        if (error) {
          console.error("Error guardando prueba:", error)
          res.status(500).json({ error: "Error guardando prueba" })
          return
        }
        res.json({
          id: results.insertId,
          ...testData,
          message: isConnected ? "Conexión a Internet correcta" : "Conexión a Internet incorrecta",
        })
      },
    )
  } catch (error) {
    console.error("Error en la prueba:", error)
    res.status(500).json({ error: "Error realizando la prueba de red" })
  }
})

app.get("/api/network-tests", (req, res) => {
  connection.query("SELECT * FROM pruebas_red ORDER BY fecha DESC", (error, results) => {
    if (error) {
      console.error("Error obteniendo pruebas:", error)
      res.status(500).json({ error: "Error obteniendo pruebas" })
      return
    }
    res.json(results)
  })
})

app.delete("/api/network-tests/:id", (req, res) => {
  const id = req.params.id
  connection.query("DELETE FROM pruebas_red WHERE id = ?", [id], (error, results) => {
    if (error) {
      console.error("Error eliminando prueba:", error)
      res.status(500).json({ error: "Error eliminando prueba" })
      return
    }
    res.json({ message: "Prueba eliminada con éxito" })
  })
})

app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`)
})

process.on("SIGINT", () => {
  connection.end()
  process.exit()
})

