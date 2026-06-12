import { Router, type IRouter } from "express";
import healthRouter from "./health";
import catalogRouter from "./catalog";
import cotizacionRouter from "./cotizacion";
import descriptivosRouter from "./descriptivos";
import authRouter from "./auth";
import agenciasRouter from "./agencias";
import plantillasRouter from "./plantillas";
import observacionesRouter from "./observaciones";
import tarifasRouter from "./tarifas";
import guardadasRouter from "./guardadas";
import oportunidadesRouter from "./oportunidades";
import backupRouter from "./backup";

const router: IRouter = Router();

router.use(healthRouter);
router.use(catalogRouter);
router.use(cotizacionRouter);
router.use(descriptivosRouter);
router.use(authRouter);
router.use(agenciasRouter);
router.use(plantillasRouter);
router.use(observacionesRouter);
router.use(tarifasRouter);
router.use(guardadasRouter);
router.use(oportunidadesRouter);
router.use(backupRouter);

export default router;
