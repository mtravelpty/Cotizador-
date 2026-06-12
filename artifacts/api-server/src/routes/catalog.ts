import express, { Router, type IRouter } from "express";
import {
  loadCatalog,
  reloadCatalog,
  getFileInfo,
  replaceAndReload,
  loadBrasilCatalog,
  reloadBrasilCatalog,
  getBrasilFileInfo,
  replaceAndReloadBrasil,
  loadEnCatalog,
  reloadEnCatalog,
  getEnFileInfo,
  replaceAndReloadEn,
  loadPtCatalog,
  reloadPtCatalog,
  getPtFileInfo,
  replaceAndReloadPt,
} from "../lib/excel";

const router: IRouter = Router();

type Lang = "es" | "en" | "pt";

function getLang(req: express.Request): Lang {
  const lang = req.query["lang"];
  if (lang === "en") return "en";
  if (lang === "pt") return "pt";
  return "es";
}

function isBrasil(req: express.Request): boolean {
  return req.query["mercado"] === "brasil";
}

function loadCatalogForLang(lang: Lang) {
  if (lang === "en") return loadEnCatalog();
  if (lang === "pt") return loadPtCatalog();
  return loadCatalog();
}

router.get("/hoteles", (req, res) => {
  try {
    if (isBrasil(req)) { res.json(loadBrasilCatalog().hoteles); return; }
    res.json(loadCatalogForLang(getLang(req)).hoteles);
  } catch (e) {
    res.status(500).json({ error: true, message: "No se pudieron cargar los hoteles", detail: (e as Error).message });
  }
});

router.get("/tours", (req, res) => {
  try {
    if (isBrasil(req)) { res.json(loadBrasilCatalog().tours); return; }
    res.json(loadCatalogForLang(getLang(req)).tours);
  } catch (e) {
    res.status(500).json({ error: true, message: "No se pudieron cargar los tours", detail: (e as Error).message });
  }
});

router.get("/traslados", (req, res) => {
  try {
    if (isBrasil(req)) { res.json(loadBrasilCatalog().traslados); return; }
    res.json(loadCatalogForLang(getLang(req)).traslados);
  } catch (e) {
    res.status(500).json({ error: true, message: "No se pudieron cargar los traslados", detail: (e as Error).message });
  }
});

router.get("/catalog", (req, res) => {
  if (isBrasil(req)) { res.json(loadBrasilCatalog()); return; }
  res.json(loadCatalogForLang(getLang(req)));
});

router.get("/catalog/info/all", (_req, res) => {
  const esInfo = getFileInfo();
  const esC = loadCatalog();
  const enInfo = getEnFileInfo();
  const enC = loadEnCatalog();
  const ptInfo = getPtFileInfo();
  const ptC = loadPtCatalog();
  res.json({
    es: {
      lang: "es",
      filename: esInfo.filename,
      loadedAt: esInfo.loadedAt,
      exists: true,
      counts: { hoteles: esC.hoteles.length, tours: esC.tours.length, traslados: esC.traslados.length },
    },
    en: {
      lang: "en",
      filename: enInfo.filename,
      loadedAt: enInfo.loadedAt,
      exists: enInfo.exists,
      counts: { hoteles: enC.hoteles.length, tours: enC.tours.length, traslados: enC.traslados.length },
    },
    pt: {
      lang: "pt",
      filename: ptInfo.filename,
      loadedAt: ptInfo.loadedAt,
      exists: ptInfo.exists,
      counts: { hoteles: ptC.hoteles.length, tours: ptC.tours.length, traslados: ptC.traslados.length },
    },
  });
});

router.get("/catalog/info", (req, res) => {
  if (isBrasil(req)) {
    const info = getBrasilFileInfo();
    const c = loadBrasilCatalog();
    res.json({ filename: info.filename, loadedAt: info.loadedAt, exists: info.exists, counts: { hoteles: c.hoteles.length, tours: c.tours.length, traslados: c.traslados.length } });
    return;
  }
  const lang = getLang(req);
  if (lang === "en") {
    const info = getEnFileInfo();
    const c = loadEnCatalog();
    res.json({ filename: info.filename, loadedAt: info.loadedAt, exists: info.exists, counts: { hoteles: c.hoteles.length, tours: c.tours.length, traslados: c.traslados.length } });
    return;
  }
  if (lang === "pt") {
    const info = getPtFileInfo();
    const c = loadPtCatalog();
    res.json({ filename: info.filename, loadedAt: info.loadedAt, exists: info.exists, counts: { hoteles: c.hoteles.length, tours: c.tours.length, traslados: c.traslados.length } });
    return;
  }
  const info = getFileInfo();
  const c = loadCatalog();
  res.json({ filename: info.filename, loadedAt: info.loadedAt, counts: { hoteles: c.hoteles.length, tours: c.tours.length, traslados: c.traslados.length } });
});

router.post("/reload", (req, res) => {
  if (isBrasil(req)) {
    const c = reloadBrasilCatalog();
    res.json({ ok: true, counts: { hoteles: c.hoteles.length, tours: c.tours.length, traslados: c.traslados.length }, loadedAt: c.loadedAt });
    return;
  }
  const lang = getLang(req);
  if (lang === "en") {
    const c = reloadEnCatalog();
    res.json({ ok: true, counts: { hoteles: c.hoteles.length, tours: c.tours.length, traslados: c.traslados.length }, loadedAt: c.loadedAt });
    return;
  }
  if (lang === "pt") {
    const c = reloadPtCatalog();
    res.json({ ok: true, counts: { hoteles: c.hoteles.length, tours: c.tours.length, traslados: c.traslados.length }, loadedAt: c.loadedAt });
    return;
  }
  const c = reloadCatalog();
  res.json({ ok: true, counts: { hoteles: c.hoteles.length, tours: c.tours.length, traslados: c.traslados.length }, loadedAt: c.loadedAt });
});

router.post(
  "/upload",
  express.raw({ type: "*/*", limit: "50mb" }),
  (req, res) => {
    try {
      const buffer = req.body as Buffer;
      if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
        res.status(400).json({ ok: false, error: "Archivo vacío o inválido" });
        return;
      }
      if (isBrasil(req)) {
        const c = replaceAndReloadBrasil(buffer);
        const info = getBrasilFileInfo();
        res.json({ ok: true, filename: info.filename, loadedAt: c.loadedAt, counts: { hoteles: c.hoteles.length, tours: c.tours.length, traslados: c.traslados.length } });
        return;
      }
      const lang = getLang(req);
      if (lang === "en") {
        const c = replaceAndReloadEn(buffer);
        const info = getEnFileInfo();
        res.json({ ok: true, filename: info.filename, loadedAt: c.loadedAt, counts: { hoteles: c.hoteles.length, tours: c.tours.length, traslados: c.traslados.length } });
        return;
      }
      if (lang === "pt") {
        const c = replaceAndReloadPt(buffer);
        const info = getPtFileInfo();
        res.json({ ok: true, filename: info.filename, loadedAt: c.loadedAt, counts: { hoteles: c.hoteles.length, tours: c.tours.length, traslados: c.traslados.length } });
        return;
      }
      const c = replaceAndReload(buffer);
      const info = getFileInfo();
      res.json({ ok: true, filename: info.filename, loadedAt: c.loadedAt, counts: { hoteles: c.hoteles.length, tours: c.tours.length, traslados: c.traslados.length } });
    } catch (e) {
      res.status(400).json({ ok: false, error: (e as Error).message });
    }
  },
);

export default router;
