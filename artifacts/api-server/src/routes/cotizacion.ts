import { Router, type IRouter } from "express";
import { loadCatalog } from "../lib/excel";
import {
  calcularCotizacion,
  type CotizacionInput,
} from "../lib/calc";

const router: IRouter = Router();

router.post("/cotizacion/calcular", (req, res) => {
  const body = req.body as CotizacionInput;
  if (!body || !Array.isArray(body.servicios)) {
    res.status(400).json({ error: "servicios (array) requerido" });
    return;
  }
  const catalog = loadCatalog();
  const result = calcularCotizacion(body, catalog);
  res.json(result);
});

export default router;
