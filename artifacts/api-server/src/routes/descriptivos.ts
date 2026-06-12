import { Router, type IRouter } from "express";
import { DESCRIPTIVOS, getDescriptivoByCodigo } from "../lib/descriptivos";

const router: IRouter = Router();

router.get("/descriptivos", (_req, res) => {
  res.json(DESCRIPTIVOS);
});

router.get("/descriptivos/:codigo", (req, res) => {
  const item = getDescriptivoByCodigo(req.params.codigo);
  if (!item) {
    res.status(404).json({ error: "Descriptivo no encontrado" });
    return;
  }
  res.json(item);
});

export default router;
