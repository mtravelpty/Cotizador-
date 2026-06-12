import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Sidebar, { type View } from "@/components/Sidebar";
import ClientForm, { AlojamientoBar } from "@/components/ClientForm";
import ServicioFormModal, {
  type ServicioTipo,
} from "@/components/ServicioFormModal";
import ServiciosSeleccionados from "@/components/ServiciosSeleccionados";
import CustomItemModal from "@/components/CustomItemModal";
import ConfiguracionPanel from "@/components/ConfiguracionPanel";
import ExportButtons from "@/components/ExportButtons";
import VistaPreviaModal from "@/components/VistaPreviaModal";
import Itinerario from "@/components/Itinerario";
import Seguimiento from "@/components/Seguimiento";
import NotificationBell from "@/components/NotificationBell";
import Plantillas from "@/components/Plantillas";
import Descriptivos from "@/components/Descriptivos";
import Tarifas from "@/components/Tarifas";
import Respaldos from "@/components/Respaldos";
import Agencias from "@/components/Agencias";
import ToastStack, { type ToastItem, type ToastTone } from "@/components/ToastStack";
import { loadObservaciones, loadObservacionesAsync, resolveObservaciones } from "@/lib/observaciones";
import {
  loadGuardadas,
  loadGuardadasAsync,
  saveGuardadas,
  guardarEnSeguimiento,
  generateNumeroCotizacion,
  duplicarCotizacion,
  registrarActividad,
  computeAutoEstado,
  loadOpportunities,
  loadOpportunitiesAsync,
  saveOpportunities,
  upsertOpportunity,
  updateOpportunity,
  type CotizacionGuardada,
  type EstadoCotizacion,
  type EstadoCRM,
  type ModoCotizacion,
  type PresentationMode,
  type QuotingMode,
  type Prioridad,
  type ActividadTipo,
  type OppHistorialEntry,
  type Opportunity,
} from "@/components/Guardadas";
import {
  loadPlantillas,
  loadPlantillasAsync,
  savePlantillas,
  serviciosToBlocks,
  newPlantilla,
  buildServiciosFromPlantilla,
  type PlantillaLoadResult,
} from "@/lib/plantillas";
import {
  loadDescriptivosLS,
  loadDescriptivosLSAsync,
  mergeDescriptivos,
} from "@/lib/descriptivos";
import {
  loadHotelesLS,
  loadHotelesLSAsync,
  loadToursLS,
  loadToursLSAsync,
  loadTrasladosLS,
  loadTrasladosLSAsync,
  mergeHoteles,
  mergeTours,
  mergeTraslados,
} from "@/lib/tarifas";
import type {
  Acomodacion,
  Cliente,
  ClienteValidationErrors,
  Descriptivo,
  Hotel,
  ServicioSeleccionado,
  Tour,
  Traslado,
} from "@/lib/types";
import type { Idioma } from "@/lib/i18n";
import { validateCliente } from "@/lib/types";
import { api, type CatalogInfo, type LangCode } from "@/lib/api";
import { calcularLocal } from "@/lib/calc";
import { Loader2, BedDouble, Car, Plane, Anchor, Compass, Package } from "lucide-react";
import { useAuth } from "@/lib/auth";

function addTwoMonths(date: Date): string {
  const d = new Date(date);
  d.setMonth(d.getMonth() + 2);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function toIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function makeDefaultCliente(): Cliente {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  return {
    nombre: "",
    cotizacionNombre: "",
    correo: "",
    whatsapp: "",
    agente: "",
    counter: "",
    fechaInicio: toIso(today),
    fechaFin: toIso(tomorrow),
    vigencia: addTwoMonths(today),
    pasajeros: 2,
    ninos: 0,
    noches: 1,
  };
}

const DEFAULT_CLIENTE = makeDefaultCliente();

interface FormState {
  open: boolean;
  tipo: ServicioTipo;
  isManual: boolean;
  allowSwitch: boolean;
  initial: ServicioSeleccionado | null;
}

const CLOSED_FORM: FormState = {
  open: false,
  tipo: "hotel",
  isManual: false,
  allowSwitch: false,
  initial: null,
};

export default function CotizadorPage() {
  const { user, logout } = useAuth();
  const [hoteles, setHoteles] = useState<Hotel[]>([]);
  const [tours, setTours] = useState<Tour[]>([]);
  const [traslados, setTraslados] = useState<Traslado[]>([]);
  const [descriptivos, setDescriptivos] = useState<Descriptivo[]>([]);
  const [fileInfo, setFileInfo] = useState<CatalogInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [idioma, setIdioma] = useState<Idioma>("es");
  const [mercado, setMercado] = useState<"general" | "brasil">("general");
  const [hotelesBrasil, setHotelesBrasil] = useState<Hotel[]>([]);
  const [toursBrasil, setToursBrasil] = useState<Tour[]>([]);
  const [trasladosBrasil, setTrasladosBrasil] = useState<Traslado[]>([]);
  const [fileInfoBrasil, setFileInfoBrasil] = useState<CatalogInfo | null>(null);

  const [hotelesEn, setHotelesEn] = useState<Hotel[]>([]);
  const [toursEn, setToursEn] = useState<Tour[]>([]);
  const [trasladosEn, setTrasladosEn] = useState<Traslado[]>([]);
  const [fileInfoEn, setFileInfoEn] = useState<CatalogInfo | null>(null);

  const [hotelesPt, setHotelesPt] = useState<Hotel[]>([]);
  const [toursPt, setToursPt] = useState<Tour[]>([]);
  const [trasladosPt, setTrasladosPt] = useState<Traslado[]>([]);
  const [fileInfoPt, setFileInfoPt] = useState<CatalogInfo | null>(null);

  const [view, setView] = useState<View>("cotizador");
  const [cliente, setCliente] = useState<Cliente>(DEFAULT_CLIENTE);
  const [validationErrors, setValidationErrors] =
    useState<ClienteValidationErrors>({});
  const [acomodaciones, setAcomodaciones] = useState<Acomodacion[]>(["DBL"]);
  const [servicios, setServicios] = useState<ServicioSeleccionado[]>([]);
  const [modo, setModo] = useState<ModoCotizacion>("tarifas");
  const [presentationMode, setPresentationMode] = useState<PresentationMode>("detailed");
  const [quotingMode, setQuotingMode] = useState<QuotingMode>("individual");
  const [habitacionesPorAcomodacion, setHabitacionesPorAcomodacion] = useState<
    Partial<Record<Acomodacion, number>>
  >({});
  const [incluirItinerario, setIncluirItinerario] = useState(false);
  const [incluirDescriptivos, setIncluirDescriptivos] = useState(false);
  const [incluirDescriptivoCompleto, setIncluirDescriptivoCompleto] =
    useState(false);
  const [personalizarTraslados, setPersonalizarTraslados] = useState(true);
  const [actividadesOverride, setActividadesOverride] = useState<
    Record<number, string>
  >({});
  const [observacionesSeleccionadas, setObservacionesSeleccionadas] = useState<
    string[]
  >([]);
  const [observacionManual, setObservacionManual] = useState("");
  const { data: observacionesCatalog = loadObservaciones() } = useQuery({
    queryKey: ["observaciones"],
    queryFn: loadObservacionesAsync,
    placeholderData: loadObservaciones,
  });
  const resolvedObservaciones = useMemo(
    () =>
      resolveObservaciones(
        observacionesCatalog,
        observacionesSeleccionadas,
        observacionManual,
      ),
    [observacionesCatalog, observacionesSeleccionadas, observacionManual],
  );
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewQuote, setPreviewQuote] = useState<CotizacionGuardada | null>(
    null,
  );
  // Stable cotización code for the current draft. Generated lazily on first
  // export/preview/save and reused across PDF, email, WhatsApp and Seguimiento
  // so all surfaces show the same code (e.g. RGE-HF9ZMW).
  const [currentNumero, setCurrentNumero] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [savedOppId, setSavedOppId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(CLOSED_FORM);
  const [customOpen, setCustomOpen] = useState(false);
  const [customEditing, setCustomEditing] =
    useState<ServicioSeleccionado | null>(null);
  const [highlightedServiceId, setHighlightedServiceId] = useState<string | null>(null);
  const [searchResetKey, setSearchResetKey] = useState(0);

  const DEFAULT_OP_ID = "op1";
  const [opcionesPaquete, setOpcionesPaquete] = useState<Array<{id: string; nombre: string}>>(
    [{ id: DEFAULT_OP_ID, nombre: "Opción 1" }],
  );
  const [activeOpcionPaquete, setActiveOpcionPaquete] = useState(DEFAULT_OP_ID);

  const [guardadas, setGuardadas] = useState<CotizacionGuardada[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  useEffect(() => {
    loadGuardadasAsync().then(setGuardadas);
    loadOpportunitiesAsync().then(setOpportunities);
  }, []);

  const [plantillasCount, setPlantillasCount] = useState(0);
  useEffect(() => { loadPlantillasAsync().then((items) => setPlantillasCount(items.length)); }, []);

  const refreshPlantillasCount = () => {
    setPlantillasCount(loadPlantillas().length);
  };

  const { data: lsDescriptivos = loadDescriptivosLS() } = useQuery({
    queryKey: ["descriptivos-custom"],
    queryFn: loadDescriptivosLSAsync,
    placeholderData: loadDescriptivosLS,
  });
  const handleDescriptivosChanged = () => {}; // no-op: React Query cache update triggers re-render

  const mergedDescriptivos = useMemo(
    () => mergeDescriptivos(lsDescriptivos, descriptivos),
    [descriptivos, lsDescriptivos],
  );

  const { data: hotelesLS = loadHotelesLS() } = useQuery({ queryKey: ["tarifas-hoteles"], queryFn: loadHotelesLSAsync, placeholderData: loadHotelesLS });
  const { data: toursLS = loadToursLS() } = useQuery({ queryKey: ["tarifas-tours"], queryFn: loadToursLSAsync, placeholderData: loadToursLS });
  const { data: trasladosLS = loadTrasladosLS() } = useQuery({ queryKey: ["tarifas-traslados"], queryFn: loadTrasladosLSAsync, placeholderData: loadTrasladosLS });
  const handleTarifasChanged = () => {}; // no-op: React Query cache update triggers re-render

  const mergedHoteles = useMemo(
    () => mergeHoteles(hotelesLS, hoteles),
    [hoteles, hotelesLS],
  );
  const mergedTours = useMemo(
    () => mergeTours(toursLS, tours),
    [tours, toursLS],
  );
  const mergedTraslados = useMemo(
    () => mergeTraslados(trasladosLS, traslados),
    [traslados, trasladosLS],
  );

  const langFallback =
    (idioma === "en" && hotelesEn.length === 0) ||
    (idioma === "pt" && hotelesPt.length === 0);

  const activeHoteles =
    idioma === "en" ? (hotelesEn.length > 0 ? hotelesEn : mergedHoteles) :
    idioma === "pt" ? (hotelesPt.length > 0 ? hotelesPt : mergedHoteles) :
    mercado === "brasil" ? hotelesBrasil : mergedHoteles;
  const activeTours =
    idioma === "en" ? (toursEn.length > 0 ? toursEn : mergedTours) :
    idioma === "pt" ? (toursPt.length > 0 ? toursPt : mergedTours) :
    mercado === "brasil" ? toursBrasil : mergedTours;
  const activeTraslados =
    idioma === "en" ? (trasladosEn.length > 0 ? trasladosEn : mergedTraslados) :
    idioma === "pt" ? (trasladosPt.length > 0 ? trasladosPt : mergedTraslados) :
    mercado === "brasil" ? trasladosBrasil : mergedTraslados;

  // Auto-fill Counter with active user name on mount and when user changes
  useEffect(() => {
    if (user?.nombre) {
      setCliente((prev) => (!prev.counter ? { ...prev, counter: user.nombre } : prev));
    }
  }, [user?.nombre]);

  const [seguimientoFlash, setSeguimientoFlash] = useState(false);

  const flashSeguimiento = () => {
    setSeguimientoFlash(true);
    window.setTimeout(() => setSeguimientoFlash(false), 2750);
  };

  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    window.setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 220);
  };

  const showToast = (msg: string, tone: ToastTone = "info", duration = 3000) => {
    const id = `t${Date.now()}${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [{ id, msg, tone }, ...prev]);
    window.setTimeout(() => dismissToast(id), duration);
  };

  const handleClienteChange = (next: Cliente) => {
    setCliente(next);
    if (Object.keys(validationErrors).length > 0) {
      const { errors } = validateCliente(next);
      setValidationErrors(errors);
    }
  };

  const validateBeforeAction = (): boolean => {
    const { ok, errors } = validateCliente(cliente);
    setValidationErrors(errors);
    if (!ok) {
      showToast("Completa los datos obligatorios", "error");
    }
    return ok;
  };

  const getOrCreateNumero = (): string => {
    if (currentNumero) return currentNumero;
    const fresh = generateNumeroCotizacion();
    setCurrentNumero(fresh);
    return fresh;
  };

  const handleActionComplete = (tipo: ActividadTipo, isNew?: boolean) => {
    if (tipo === "whatsapp_enviado") return;

    if (tipo === "guardado_manual") {
      handleSave();
      return;
    }

    // For correo/pdf: save was done BEFORE copy/download; just flash, toast, clear.
    const toastMsg = isNew
      ? "Cotización enviada a Seguimiento"
      : "Cotización actualizada en Seguimiento";
    showToast(toastMsg, "success");
    flashSeguimiento();

    setCliente({ ...makeDefaultCliente(), counter: user?.nombre ?? "" });
    setValidationErrors({});
    setAcomodaciones(["DBL"]);
    setHabitacionesPorAcomodacion({});
    setQuotingMode("individual");
    setServicios([]);
    setModo("tarifas");
    setPresentationMode("detailed");
    setIdioma("es");
    setMercado("general");
    setIncluirItinerario(false);
    setIncluirDescriptivos(false);
    setIncluirDescriptivoCompleto(false);
    setPersonalizarTraslados(true);
    setActividadesOverride({});
    setObservacionesSeleccionadas([]);
    setObservacionManual("");
    setCurrentNumero(null);
    setSavedId(null);
    setSavedOppId(null);
    setSearchResetKey((k) => k + 1);
  };

  const fetchAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const safeArray = <T,>(p: Promise<T[]>): Promise<T[] | null> =>
        p.then((v) => v).catch(() => null);

      const [h, t, tr, ds, allInfo, brasilInfo] = await Promise.all([
        safeArray(api.hoteles()),
        safeArray(api.tours()),
        safeArray(api.traslados()),
        api.descriptivos().catch(() => [] as Descriptivo[]),
        api.catalogInfoAll().catch(() => null),
        api.catalogInfoBrasil().catch(() => null),
      ]);

      // If all three core catalogs failed it means the backend is unreachable — show the blocking error
      if (h === null && t === null && tr === null) {
        setError("No se pudo conectar con el servidor. Verifica que el backend esté activo.");
        return;
      }

      // Apply data, using empty arrays for any that failed individually
      setHoteles(h ?? []);
      setTours(t ?? []);
      setTraslados(tr ?? []);
      setDescriptivos(ds);
      setFileInfo(allInfo?.es ?? null);
      setFileInfoEn(allInfo?.en ?? null);
      setFileInfoPt(allInfo?.pt ?? null);
      setFileInfoBrasil(brasilInfo);

      // Warn about any partial failures without blocking the UI
      const partial: string[] = [];
      if (h === null) partial.push("hoteles");
      if (t === null) partial.push("tours");
      if (tr === null) partial.push("traslados");
      if (partial.length > 0) {
        showToast(
          `No se pudieron cargar: ${partial.join(", ")}. Intenta recargar el tarifario.`,
          "warning",
        );
      }

      const fetchLang = async (info: { counts?: { hoteles: number } | null } | null, lang: "en" | "pt", setH: (v: Hotel[]) => void, setT: (v: Tour[]) => void, setTr: (v: Traslado[]) => void) => {
        if (info?.counts && info.counts.hoteles > 0) {
          const [lh, lt, ltr] = await Promise.all([
            safeArray(api.hotelesLang(lang)),
            safeArray(api.toursLang(lang)),
            safeArray(api.trasladosLang(lang)),
          ]);
          setH(lh ?? []); setT(lt ?? []); setTr(ltr ?? []);
        }
      };

      await Promise.all([
        brasilInfo?.counts && brasilInfo.counts.hoteles > 0
          ? Promise.all([
              safeArray(api.hotelesBrasil()),
              safeArray(api.toursBrasil()),
              safeArray(api.trasladosBrasil()),
            ]).then(([hb, tb, trb]) => {
              setHotelesBrasil(hb ?? []);
              setToursBrasil(tb ?? []);
              setTrasladosBrasil(trb ?? []);
            })
          : Promise.resolve(),
        fetchLang(allInfo?.en ?? null, "en", setHotelesEn, setToursEn, setTrasladosEn),
        fetchLang(allInfo?.pt ?? null, "pt", setHotelesPt, setToursPt, setTrasladosPt),
      ]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleTarifarioReload = async () => {
    try {
      const { hoteles: h, tours: t, traslados: tr, descriptivos: ds, loadedAt } =
        await api.reloadAll();
      setHoteles(h);
      setTours(t);
      setTraslados(tr);
      setDescriptivos(ds);
      setFileInfo((prev) => ({
        filename: prev?.filename ?? "TARIFARIO.xlsx",
        loadedAt,
        counts: { hoteles: h.length, tours: t.length, traslados: tr.length },
      }));
      showToast(
        `Tarifario actualizado · ${h.length} hoteles · ${t.length} tours · ${tr.length} traslados`,
      );
    } catch (e) {
      console.error("[Recargar tarifario]", e);
      showToast("Error al recargar el tarifario", "error");
      throw e;
    }
  };

  const handleUpload = async (file: File) => {
    try {
      const result = await api.uploadTarifario(file);
      const [h, t, tr, ds] = await Promise.all([
        api.hoteles(),
        api.tours(),
        api.traslados(),
        api.descriptivos().catch(() => [] as Descriptivo[]),
      ]);
      setHoteles(h);
      setTours(t);
      setTraslados(tr);
      setDescriptivos(ds);
      setFileInfo({
        filename: result.filename,
        loadedAt: result.loadedAt,
        counts: result.counts,
      });
      showToast(
        `Tarifario General actualizado · ${result.counts.hoteles} hoteles · ${result.counts.tours} tours`,
      );
    } catch (e) {
      console.error("[Subir tarifario]", e);
      showToast((e as Error).message || "Error al subir el tarifario", "error");
      throw e;
    }
  };

  const handleTarifarioReloadBrasil = async () => {
    try {
      const { hoteles: h, tours: t, traslados: tr, loadedAt } = await api.reloadAllBrasil();
      setHotelesBrasil(h);
      setToursBrasil(t);
      setTrasladosBrasil(tr);
      setFileInfoBrasil((prev) => ({
        filename: prev?.filename ?? "TARIFARIO_BRASIL.xlsx",
        loadedAt,
        counts: { hoteles: h.length, tours: t.length, traslados: tr.length },
      }));
      showToast(`Tarifario Brasil actualizado · ${h.length} hoteles · ${t.length} tours`);
    } catch (e) {
      console.error("[Recargar tarifario Brasil]", e);
      showToast("Error al recargar el tarifario Brasil", "error");
      throw e;
    }
  };

  const handleUploadBrasil = async (file: File) => {
    try {
      const result = await api.uploadTarifarioBrasil(file);
      const [h, t, tr] = await Promise.all([
        api.hotelesBrasil(),
        api.toursBrasil(),
        api.trasladosBrasil(),
      ]);
      setHotelesBrasil(h);
      setToursBrasil(t);
      setTrasladosBrasil(tr);
      setFileInfoBrasil({
        filename: result.filename,
        loadedAt: result.loadedAt,
        counts: result.counts,
      });
      showToast(`Tarifario Brasil cargado · ${result.counts.hoteles} hoteles · ${result.counts.tours} tours`);
    } catch (e) {
      console.error("[Subir tarifario Brasil]", e);
      showToast((e as Error).message || "Error al subir el tarifario Brasil", "error");
      throw e;
    }
  };

  const makeLangReloadHandler = (lang: LangCode, setH: (v: Hotel[]) => void, setT: (v: Tour[]) => void, setTr: (v: Traslado[]) => void, setInfo: (v: CatalogInfo) => void) => async () => {
    try {
      const { hoteles: h, tours: t, traslados: tr, loadedAt } = await api.reloadAllLang(lang);
      setH(h); setT(t); setTr(tr);
      setInfo({ filename: `TARIFARIO_${lang.toUpperCase()}.xlsx`, loadedAt, counts: { hoteles: h.length, tours: t.length, traslados: tr.length } });
      showToast(`Tarifario ${lang.toUpperCase()} actualizado · ${h.length} hoteles · ${t.length} tours`);
    } catch (e) {
      console.error(`[Recargar tarifario ${lang}]`, e);
      showToast(`Error al recargar el tarifario ${lang.toUpperCase()}`, "error");
      throw e;
    }
  };

  const makeLangUploadHandler = (lang: LangCode, setH: (v: Hotel[]) => void, setT: (v: Tour[]) => void, setTr: (v: Traslado[]) => void, setInfo: (v: CatalogInfo) => void) => async (file: File) => {
    try {
      const result = await api.uploadTarifarioLang(lang, file);
      const [h, t, tr] = await Promise.all([api.hotelesLang(lang), api.toursLang(lang), api.trasladosLang(lang)]);
      setH(h); setT(t); setTr(tr);
      setInfo({ filename: result.filename, loadedAt: result.loadedAt, counts: result.counts });
      showToast(`Tarifario ${lang.toUpperCase()} cargado · ${result.counts.hoteles} hoteles · ${result.counts.tours} tours`);
    } catch (e) {
      console.error(`[Subir tarifario ${lang}]`, e);
      showToast((e as Error).message || `Error al subir el tarifario ${lang.toUpperCase()}`, "error");
      throw e;
    }
  };

  const handleTarifarioReloadEn = makeLangReloadHandler("en", setHotelesEn, setToursEn, setTrasladosEn, setFileInfoEn as (v: CatalogInfo) => void);
  const handleUploadEn = makeLangUploadHandler("en", setHotelesEn, setToursEn, setTrasladosEn, setFileInfoEn as (v: CatalogInfo) => void);
  const handleTarifarioReloadPt = makeLangReloadHandler("pt", setHotelesPt, setToursPt, setTrasladosPt, setFileInfoPt as (v: CatalogInfo) => void);
  const handleUploadPt = makeLangUploadHandler("pt", setHotelesPt, setToursPt, setTrasladosPt, setFileInfoPt as (v: CatalogInfo) => void);


  const result = useMemo(() => {
    const r = calcularLocal(servicios, acomodaciones, cliente);
    return {
      ...r,
      servicios: r.servicios.map((s) => {
        if (s.tipo !== "hotel" || s.desayuno) return s;
        const cat = mergedHoteles.find((h) => h.id === s.codigo || (h as any).codigo === s.codigo || h.id === s.id);
        return cat?.desayuno ? { ...s, desayuno: cat.desayuno } : s;
      }),
    };
  }, [servicios, acomodaciones, cliente, mergedHoteles]);

  const previewResult = useMemo(() => {
    if (!previewQuote) return result;
    const r = calcularLocal(
      previewQuote.servicios,
      previewQuote.acomodaciones,
      previewQuote.cliente,
    );
    return {
      ...r,
      servicios: r.servicios.map((s) => {
        if (s.tipo !== "hotel" || s.desayuno) return s;
        const cat = mergedHoteles.find((h) => h.id === s.codigo || (h as any).codigo === s.codigo || h.id === s.id);
        return cat?.desayuno ? { ...s, desayuno: cat.desayuno } : s;
      }),
    };
  }, [previewQuote, result, mergedHoteles]);

  const diffCotizacion = (
    prev: CotizacionGuardada,
    next: {
      cliente: Cliente;
      servicios: ServicioSeleccionado[];
      acomodaciones: Acomodacion[];
      observacionesSeleccionadas: string[];
      observacionManual: string;
      total: number;
    },
  ): string[] => {
    const changes: string[] = [];
    const pc = prev.cliente;
    const nc = next.cliente;

    const fmtDate = (iso?: string) => {
      if (!iso) return "—";
      const parts = iso.split("-");
      if (parts.length !== 3) return iso;
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    };
    const fmtMon = (n: number) =>
      `USD ${n.toLocaleString("es-ES", { maximumFractionDigits: 0 })}`;

    if ((pc.correo ?? "") !== (nc.correo ?? ""))
      changes.push(`Agencia: ${pc.correo || "—"} → ${nc.correo || "—"}`);
    if ((pc.agente ?? "") !== (nc.agente ?? ""))
      changes.push(`Agente: ${pc.agente || "—"} → ${nc.agente || "—"}`);
    if ((pc.counter ?? "") !== (nc.counter ?? ""))
      changes.push(`Counter: ${pc.counter || "—"} → ${nc.counter || "—"}`);
    if ((pc.cotizacionNombre ?? "") !== (nc.cotizacionNombre ?? ""))
      changes.push(`Nombre: "${pc.cotizacionNombre || "—"}" → "${nc.cotizacionNombre || "—"}"`);
    if ((pc.fechaInicio ?? "") !== (nc.fechaInicio ?? ""))
      changes.push(`Llegada: ${fmtDate(pc.fechaInicio)} → ${fmtDate(nc.fechaInicio)}`);
    if ((pc.fechaFin ?? "") !== (nc.fechaFin ?? ""))
      changes.push(`Salida: ${fmtDate(pc.fechaFin)} → ${fmtDate(nc.fechaFin)}`);
    if ((pc.vigencia ?? "") !== (nc.vigencia ?? ""))
      changes.push(`Vigencia: ${fmtDate(pc.vigencia)} → ${fmtDate(nc.vigencia)}`);
    if (pc.pasajeros !== nc.pasajeros)
      changes.push(`Pasajeros: ${pc.pasajeros} → ${nc.pasajeros}`);
    if ((pc.ninos ?? 0) !== (nc.ninos ?? 0))
      changes.push(`Niños: ${pc.ninos ?? 0} → ${nc.ninos ?? 0}`);
    if (pc.noches !== nc.noches)
      changes.push(`Noches: ${pc.noches} → ${nc.noches}`);

    const prevAcom = [...prev.acomodaciones].sort().join(",");
    const nextAcom = [...next.acomodaciones].sort().join(",");
    if (prevAcom !== nextAcom)
      changes.push(`Acomodación: ${prev.acomodaciones.join("/")} → ${next.acomodaciones.join("/")}`);

    const TIPO_LABEL: Record<string, string> = {
      hotel: "Hotel", tour: "Tour", traslado: "Traslado",
      vuelo: "Vuelo", catamaran: "Catamarán", custom: "Ítem",
    };
    const prevMap = new Map(prev.servicios.map((s) => [`${s.tipo}::${s.id}`, s]));
    const nextMap = new Map(next.servicios.map((s) => [`${s.tipo}::${s.id}`, s]));
    for (const [key, s] of nextMap)
      if (!prevMap.has(key))
        changes.push(`${TIPO_LABEL[s.tipo] ?? s.tipo} agregado: ${s.nombre}`);
    for (const [key, s] of prevMap)
      if (!nextMap.has(key))
        changes.push(`${TIPO_LABEL[s.tipo] ?? s.tipo} eliminado: ${s.nombre}`);

    const prevObsKey = [...(prev.observacionesSeleccionadas ?? [])].sort().join(",");
    const nextObsKey = [...next.observacionesSeleccionadas].sort().join(",");
    if (
      prevObsKey !== nextObsKey ||
      (prev.observacionManual ?? "").trim() !== next.observacionManual.trim()
    )
      changes.push("Observaciones modificadas");

    const prevTotal = prev.valorCotizacion ?? 0;
    if (Math.abs(prevTotal - next.total) >= 1 && next.total > 0)
      changes.push(`Total: ${fmtMon(prevTotal)} → ${fmtMon(next.total)}`);

    return changes;
  };

  const buildOppInput = (quoteId: string, numero: string, total: number) => ({
    quoteId,
    numeroCotizacion: numero,
    agencyName: cliente.correo || cliente.nombre || "",
    agentName: cliente.agente || "",
    counterName: cliente.counter || "",
    quoteName: cliente.cotizacionNombre || "",
    destination: cliente.cotizacionNombre || "",
    total: total > 0 ? total : undefined,
    createdByName: user?.nombre,
    createdByUserId: user?.id,
    createdByEmail: user?.correo,
  });

  const handleSave = (opts: { silent?: boolean } = {}): { ok: boolean; isNew: boolean } => {
    const isNew = !savedId;
    const numero = getOrCreateNumero();
    const now = new Date().toISOString();
    const total = result.totalesPorAcomodacion[acomodaciones[0]] ?? 0;
    const autoPriority: Prioridad =
      total > 1500 ? "alta" : total > 500 ? "media" : "baja";

    if (savedId) {
      const prevQuote = guardadas.find((g) => g.id === savedId);
      const next = guardadas.map((g) =>
        g.id === savedId
          ? {
              ...g,
              cliente,
              servicios,
              acomodaciones,
              modoCotizacion: modo,
              observacionesSeleccionadas:
                observacionesSeleccionadas.length > 0
                  ? [...observacionesSeleccionadas]
                  : undefined,
              observacionManual: observacionManual.trim() || undefined,
              prioridad: autoPriority,
              updatedByName: user?.nombre,
              updatedByUserId: user?.id,
              updatedByEmail: user?.correo,
              updatedAt: now,
              ultimoSeguimiento: now,
              historial: [...(g.historial ?? []), { fecha: now, tipo: "editada" as const, byUser: user?.nombre }],
              presentationMode,
              opcionesPaquete: opcionesPaquete.length > 1 ? [...opcionesPaquete] : undefined,
            }
          : g,
      );
      saveGuardadas(next);
      setGuardadas(next);
      const updatedQuote = next.find((g) => g.id === savedId);
      if (updatedQuote) {
        const targetOppId =
          savedOppId ??
          opportunities.find((o) => o.quotes.some((q) => q.id === savedId))?.id;

        let nextOpps = targetOppId
          ? updateOpportunity(targetOppId, {
              totalLatest: total > 0 ? total : undefined,
              latestQuoteCode: updatedQuote.numeroCotizacion,
              destination: cliente.cotizacionNombre || undefined,
              updatedByName: user?.nombre,
              updatedByUserId: user?.id,
              updatedByEmail: user?.correo,
              updatedAt: now,
            })
          : upsertOpportunity(buildOppInput(savedId!, updatedQuote.numeroCotizacion, total));

        if (prevQuote) {
          const cambios = diffCotizacion(prevQuote, {
            cliente,
            servicios,
            acomodaciones,
            observacionesSeleccionadas,
            observacionManual,
            total,
          });
          if (cambios.length > 0) {
            const oppId = targetOppId ?? nextOpps.find((o) => o.quotes.some((q) => q.id === savedId))?.id;
            if (oppId) {
              const opp = nextOpps.find((o) => o.id === oppId)!;
              const modEntry: OppHistorialEntry = {
                fecha: now,
                tipo: "cotizacion_modificada",
                detalle: `${cambios.length} cambio${cambios.length !== 1 ? "s" : ""}`,
                cambios,
                byUser: user?.nombre,
              };
              nextOpps = updateOpportunity(oppId, {
                historial: [modEntry, ...(opp.historial ?? [])].slice(0, 100),
              });
            }
          }
        }
        setOpportunities(nextOpps);
      }
    } else {
      const newId = `${Date.now()}`;
      const base: CotizacionGuardada = {
        id: newId,
        fechaCreacion: now,
        numeroCotizacion: numero,
        cliente,
        servicios,
        acomodaciones,
        modoCotizacion: modo,
        observacionesSeleccionadas:
          observacionesSeleccionadas.length > 0
            ? [...observacionesSeleccionadas]
            : undefined,
        observacionManual: observacionManual.trim() || undefined,
        estadoCRM: "esperando_cliente",
        sentAt: now,
        prioridad: autoPriority,
        createdByName: user?.nombre,
        createdByUserId: user?.id,
        createdByEmail: user?.correo,
        valorCotizacion: total,
        ultimoSeguimiento: now,
        historial: [{ fecha: now, tipo: "creada", byUser: user?.nombre }],
        presentationMode,
        opcionesPaquete: opcionesPaquete.length > 1 ? [...opcionesPaquete] : undefined,
      };
      const item = { ...base, estadoCRM: computeAutoEstado(base) };
      const next = [item, ...guardadas].slice(0, 30);
      saveGuardadas(next);
      setGuardadas(next);
      setSavedId(item.id);
      const nextOpps = upsertOpportunity(buildOppInput(newId, numero, total));
      const newOpp = nextOpps.find((o) => o.quotes.some((q) => q.id === newId));
      if (newOpp) setSavedOppId(newOpp.id);
      setOpportunities(nextOpps);
    }

    if (!opts.silent) {
      flashSeguimiento();
      showToast(
        isNew ? "Cotización enviada a Seguimiento" : "Cotización actualizada en Seguimiento",
        "success",
      );
    }
    return { ok: true, isNew };
  };

  const handleRegisterActivity = (tipo: ActividadTipo) => {
    const numero = currentNumero ?? getOrCreateNumero();
    const now = new Date().toISOString();
    const newEntry = { fecha: now, tipo, byUser: user?.nombre };
    const total = result.totalesPorAcomodacion[acomodaciones[0]] ?? 0;
    const autoPriority: Prioridad =
      total > 1500 ? "alta" : total > 500 ? "media" : "baja";

    // Only PDF and email create/update opportunities (not WhatsApp)
    const shouldUpsertOpp = tipo === "correo_enviado" || tipo === "pdf_enviado";

    let newQuoteId: string | null = null;

    setGuardadas((prev) => {
      const idx = prev.findIndex((g) => g.numeroCotizacion === numero);

      const isSend = tipo === "whatsapp_enviado" || tipo === "correo_enviado" || tipo === "pdf_enviado";

      if (idx === -1) {
        newQuoteId = `${Date.now()}`;
        const nuevaBase: CotizacionGuardada = {
          id: newQuoteId,
          fechaCreacion: now,
          numeroCotizacion: numero,
          cliente,
          servicios,
          acomodaciones,
          modoCotizacion: modo,
          estadoCRM: isSend ? "esperando_cliente" : "nueva",
          sentAt: isSend ? now : undefined,
          prioridad: autoPriority,
          valorCotizacion: total,
          ultimoSeguimiento: now,
          createdByName: user?.nombre,
          createdByUserId: user?.id,
          createdByEmail: user?.correo,
          historial: [{ fecha: now, tipo: "creada", byUser: user?.nombre }, newEntry],
          observacionesSeleccionadas:
            observacionesSeleccionadas.length > 0
              ? [...observacionesSeleccionadas]
              : undefined,
          observacionManual: observacionManual.trim() || undefined,
        };
        const nueva = { ...nuevaBase, estadoCRM: isSend ? computeAutoEstado(nuevaBase) : "nueva" };
        const next = [nueva, ...prev].slice(0, 50);
        saveGuardadas(next);
        return next;
      }

      newQuoteId = prev[idx].id;
      const g = prev[idx];
      const days = Math.floor(
        (Date.now() -
          new Date(g.ultimoSeguimiento ?? g.fechaCreacion).getTime()) /
          (1000 * 60 * 60 * 24),
      );
      let finalPriority = autoPriority;
      if (days >= 3) {
        if (finalPriority === "baja") finalPriority = "media";
        else if (finalPriority === "media") finalPriority = "alta";
      }
      const next = prev.map((item) => {
        if (item.numeroCotizacion !== numero) return item;
        const updated = {
          ...item,
          sentAt: isSend ? (item.sentAt ?? now) : item.sentAt,
          ultimoSeguimiento: now,
          prioridad: finalPriority,
          valorCotizacion: total,
          historial: [newEntry, ...(item.historial ?? [])].slice(0, 50),
        };
        return { ...updated, estadoCRM: computeAutoEstado(updated) };
      });
      saveGuardadas(next);
      return next;
    });

    if (shouldUpsertOpp && newQuoteId) {
      const upserted = upsertOpportunity(buildOppInput(newQuoteId, numero, total));
      // Register typed historial entry on the opportunity
      const oppId = upserted.find((o) => o.quotes.some((q) => q.id === newQuoteId))?.id;
      if (oppId) {
        const oppTipo: OppHistorialEntry["tipo"] = tipo === "pdf_enviado" ? "pdf_generado" : "correo_generado";
        const opp = upserted.find((o) => o.id === oppId)!;
        const entry: OppHistorialEntry = { fecha: now, tipo: oppTipo, byUser: user?.nombre };
        const finalOpps = updateOpportunity(oppId, {
          historial: [entry, ...(opp.historial ?? [])].slice(0, 100),
        });
        setOpportunities(finalOpps);
      } else {
        setOpportunities(upserted);
      }
    }
  };

  const handleClear = () => {
    if (servicios.length > 0 && !confirm("¿Limpiar la cotización actual?"))
      return;
    setCliente({ ...makeDefaultCliente(), counter: user?.nombre ?? "" });
    setValidationErrors({});
    setAcomodaciones(["DBL"]);
    setServicios([]);
    setModo("tarifas");
    setQuotingMode("individual");
    setHabitacionesPorAcomodacion({});
    setCurrentNumero(null);
    setSavedId(null);
    setSavedOppId(null);
    setObservacionesSeleccionadas([]);
    setObservacionManual("");
    setOpcionesPaquete([{ id: DEFAULT_OP_ID, nombre: "Opción 1" }]);
    setActiveOpcionPaquete(DEFAULT_OP_ID);
  };

  const ROOM_PAX_MAP: Partial<Record<Acomodacion, number>> = { SGL: 1, DBL: 2, TPL: 3, QDL: 4 };

  const handleQuotingModeChange = (newMode: QuotingMode) => {
    if (newMode === quotingMode) return;

    if (newMode === "grupo") {
      // Individual → Grupo: seed one room per active accommodation
      const seed: Partial<Record<Acomodacion, number>> = {};
      for (const a of acomodaciones) {
        if (ROOM_PAX_MAP[a] !== undefined) seed[a] = 1;
      }
      setHabitacionesPorAcomodacion(seed);
    } else {
      // Grupo → Individual: pick the predominant accommodation
      const roomAcoms = (["SGL", "DBL", "TPL", "QDL"] as Acomodacion[]).filter(
        (a) => (habitacionesPorAcomodacion[a] ?? 0) > 0,
      );
      if (roomAcoms.length > 0) {
        // Use the one with the most rooms; tie-break by last in list
        const dominant = roomAcoms.reduce((best, a) =>
          (habitacionesPorAcomodacion[a] ?? 0) >= (habitacionesPorAcomodacion[best] ?? 0)
            ? a
            : best,
        );
        setAcomodaciones([dominant]);
      }
    }

    setQuotingMode(newMode);
  };

  const handleAddOpcion = () => {
    const nextIdx = opcionesPaquete.length + 1;
    const newId = `op${Date.now()}`;
    setOpcionesPaquete((prev) => [...prev, { id: newId, nombre: `Opción ${nextIdx}` }]);
    setActiveOpcionPaquete(newId);
  };

  const handleRenameOpcion = (id: string, nombre: string) => {
    setOpcionesPaquete((prev) =>
      prev.map((op) => (op.id === id ? { ...op, nombre } : op)),
    );
  };

  const handleDeleteOpcion = (id: string) => {
    const remaining = opcionesPaquete.filter((op) => op.id !== id);
    if (remaining.length === 0) return;
    setOpcionesPaquete(remaining);
    setServicios((prev) => prev.filter((s) => s.paqueteOpcionId !== id));
    if (activeOpcionPaquete === id) {
      setActiveOpcionPaquete(remaining[0].id);
    }
  };

  const handleQuickAdd = (s: ServicioSeleccionado) => {
    const isHotelInPaquete = s.tipo === "hotel" && presentationMode === "package";
    const instanceId = isHotelInPaquete ? `${s.id}__${activeOpcionPaquete}` : s.id;
    const enriched: ServicioSeleccionado = isHotelInPaquete
      ? { ...s, id: instanceId, codigo: s.codigo ?? s.id, paqueteOpcionId: activeOpcionPaquete }
      : s;

    setServicios((prev) => {
      const exists = prev.some((x) => x.tipo === enriched.tipo && x.id === enriched.id);
      if (exists)
        return prev.map((x) => (x.tipo === enriched.tipo && x.id === enriched.id ? enriched : x));
      return [...prev, enriched];
    });
    setHighlightedServiceId(enriched.id);
    showToast(customEditing ? "Servicio actualizado" : "Servicio agregado");
    window.setTimeout(() => {
      setHighlightedServiceId((curr) => (curr === enriched.id ? null : curr));
    }, 1500);
  };

  const openEdit = (s: ServicioSeleccionado) => {
    if (s.tipo === "vuelo" || s.tipo === "catamaran") {
      setCustomEditing(s);
      setCustomOpen(true);
      return;
    }
    setForm({
      open: true,
      tipo: s.tipo as import("@/components/ServicioFormModal").ServicioTipo,
      isManual: !!s.manual,
      allowSwitch: !!s.manual,
      initial: s,
    });
  };

  const handleFormSave = (s: ServicioSeleccionado) => {
    const exists = servicios.some(
      (x) => x.tipo === s.tipo && x.id === s.id,
    );
    if (exists) {
      setServicios(
        servicios.map((x) => (x.tipo === s.tipo && x.id === s.id ? s : x)),
      );
    } else {
      setServicios([...servicios, s]);
    }
    setForm(CLOSED_FORM);
  };

  // Seguimiento handlers
  const seguimientoView = (g: CotizacionGuardada) => {
    setPreviewQuote(g);
    setPreviewOpen(true);
  };
  const seguimientoEdit = (g: CotizacionGuardada) => {
    setCliente({ ...makeDefaultCliente(), ...g.cliente });
    setValidationErrors({});
    setAcomodaciones(g.acomodaciones);
    setServicios(g.servicios);
    setModo(g.modoCotizacion);
    setCurrentNumero(g.numeroCotizacion);
    setSavedId(g.id);
    const opp = opportunities.find((o) => o.quotes.some((q) => q.id === g.id));
    setSavedOppId(opp?.id ?? null);
    setObservacionesSeleccionadas(g.observacionesSeleccionadas ?? []);
    setObservacionManual(g.observacionManual ?? "");
    if (g.opcionesPaquete && g.opcionesPaquete.length > 0) {
      setOpcionesPaquete(g.opcionesPaquete);
      setActiveOpcionPaquete(g.opcionesPaquete[0].id);
    } else {
      setOpcionesPaquete([{ id: DEFAULT_OP_ID, nombre: "Opción 1" }]);
      setActiveOpcionPaquete(DEFAULT_OP_ID);
    }
    setView("cotizador");
  };
  const seguimientoDelete = (id: string) => {
    if (!confirm("¿Eliminar esta cotización?")) return;
    const next = guardadas.filter((x) => x.id !== id);
    saveGuardadas(next);
    setGuardadas(next);
  };
  const seguimientoDuplicate = (g: CotizacionGuardada) => {
    const copia = duplicarCotizacion(g);
    const next = [copia, ...guardadas].slice(0, 50);
    saveGuardadas(next);
    setGuardadas(next);
    showToast(`Cotización duplicada como ${copia.numeroCotizacion}`);
  };
  const seguimientoUpdateEstado = (id: string, estado: EstadoCotizacion) => {
    const next = guardadas.map((g) =>
      g.id === id ? { ...g, estado } : g,
    );
    saveGuardadas(next);
    setGuardadas(next);
  };

  const seguimientoUpdateCRM = (
    id: string,
    patch: Partial<CotizacionGuardada>,
  ) => {
    const next = guardadas.map((g) => {
      if (g.id !== id) return g;
      const updated = { ...g, ...patch };
      return { ...updated, estadoCRM: computeAutoEstado(updated) };
    });
    saveGuardadas(next);
    setGuardadas(next);
  };

  const seguimientoUpdateOpportunity = (id: string, patch: Partial<Opportunity>) => {
    const next = updateOpportunity(id, patch);
    setOpportunities(next);
  };

  const closePreview = () => {
    setPreviewOpen(false);
    setPreviewQuote(null);
  };

  const handleUsarPlantilla = (result: PlantillaLoadResult) => {
    setServicios(result.servicios);
    if (result.observaciones.length > 0) {
      setObservacionManual(result.observaciones.join("\n"));
    }
    setCurrentNumero(null);
    setView("cotizador");
    const parts: string[] = [];
    if (result.servicios.length > 0)
      parts.push(`${result.servicios.length} servicio${result.servicios.length !== 1 ? "s" : ""}`);
    if (result.observaciones.length > 0)
      parts.push(`${result.observaciones.length} obs.`);
    const missing =
      result.noEncontrados.length > 0
        ? ` · ${result.noEncontrados.length} sin coincidencia en tarifario (manual)`
        : "";
    showToast(
      parts.length > 0
        ? `Plantilla cargada · ${parts.join(", ")}${missing}`
        : "Plantilla cargada (sin servicios ni observaciones)",
    );
  };

  const handleCargarPlantillaEnCotizacion = (plantillaId: string) => {
    const plantilla = loadPlantillas().find((p) => p.id === plantillaId);
    if (!plantilla) return;
    const result = buildServiciosFromPlantilla(
      plantilla,
      mergedHoteles,
      mergedTours,
      mergedTraslados,
    );
    setServicios((prev) => [...prev, ...result.servicios]);
    if (result.observaciones.length > 0) {
      setObservacionManual((prev) => {
        const existingLines = prev.trim()
          ? prev
              .trim()
              .split("\n")
              .map((l) => l.trim().toLowerCase())
          : [];
        const newLines = result.observaciones.filter(
          (l) => !existingLines.includes(l.trim().toLowerCase()),
        );
        const combined = [
          ...(prev.trim() ? [prev.trim()] : []),
          ...newLines,
        ].join("\n");
        return combined;
      });
    }
    const parts: string[] = [];
    if (result.servicios.length > 0)
      parts.push(`${result.servicios.length} servicio${result.servicios.length !== 1 ? "s" : ""}`);
    if (result.observaciones.length > 0)
      parts.push(`${result.observaciones.length} obs.`);
    const missing =
      result.noEncontrados.length > 0
        ? ` · ${result.noEncontrados.length} sin coincidencia (manual)`
        : "";
    showToast(
      parts.length > 0
        ? `"${plantilla.nombre}" · ${parts.join(", ")} agregados${missing}`
        : `"${plantilla.nombre}" cargada (plantilla vacía)`,
    );
  };

  const handleGuardarComoPlantilla = () => {
    if (servicios.length === 0) return;
    const nombre = window.prompt("Nombre para la nueva plantilla:");
    if (!nombre?.trim()) return;
    const plantilla = newPlantilla(nombre.trim());
    plantilla.bloques = serviciosToBlocks(servicios);
    const existing = loadPlantillas();
    const next = [plantilla, ...existing];
    savePlantillas(next);
    setPlantillasCount(next.length);
    showToast(`Plantilla "${plantilla.nombre}" guardada`);
  };

  const previewModo: ModoCotizacion = previewQuote?.modoCotizacion ?? modo;
  const previewCliente = previewQuote?.cliente ?? cliente;
  const previewServicios = previewQuote?.servicios ?? servicios;
  const previewNumero =
    previewQuote?.numeroCotizacion ?? currentNumero ?? "";

  const bellSlot = (
    <NotificationBell
      items={guardadas}
      opportunities={opportunities}
      onView={seguimientoView}
      onUpdateCRM={seguimientoUpdateCRM}
      onUpdateOpportunity={seguimientoUpdateOpportunity}
      onGoToSeguimiento={() => setView("seguimiento")}
    />
  );

  return (
    <div className="flex min-h-screen bg-[#f2eaef]">
      <Sidebar
        view={view}
        onView={(v) => {
          if (v === "plantillas") refreshPlantillasCount();
          setView(v);
        }}
        seguimientoFlash={seguimientoFlash}
        user={user}
        onLogout={logout}
      />

      <main className="flex-1 overflow-x-hidden bg-[#f2eaef]">

        <div className="px-5 py-7 max-w-[1400px]">
          {loading ? (
            <div className="bg-white rounded-2xl shadow-md p-12 flex flex-col items-center justify-center gap-3 text-slate-600">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <div>Cargando tarifario desde Excel…</div>
            </div>
          ) : error ? (
            <div className="bg-white rounded-2xl shadow-md p-6 border-l-4 border-red-500">
              <div className="font-medium text-red-700">
                Error cargando datos
              </div>
              <div className="text-sm text-slate-700 mt-1">{error}</div>
              <button
                onClick={fetchAll}
                className="mt-3 px-3 py-1.5 rounded-md bg-slate-900 text-white text-sm"
              >
                Reintentar
              </button>
            </div>
          ) : view === "seguimiento" ? (
            <div className="space-y-6">
              <ModuleRibbon title="SEGUIMIENTO" rightSlot={bellSlot} />
              <Seguimiento
                items={guardadas}
                opportunities={opportunities}
                onView={seguimientoView}
                onEdit={seguimientoEdit}
                onDelete={seguimientoDelete}
                onDuplicate={seguimientoDuplicate}
                onUpdateCRM={seguimientoUpdateCRM}
                onUpdateOpportunity={seguimientoUpdateOpportunity}
              />
            </div>
          ) : view === "agencias" ? (
            <div className="space-y-6">
              <ModuleRibbon title="AGENCIAS" rightSlot={bellSlot} />
              <Agencias />
            </div>
          ) : view === "plantillas" ? (
            <div className="space-y-6">
              <ModuleRibbon title="PLANTILLAS" rightSlot={bellSlot} />
              <Plantillas
                hoteles={mergedHoteles}
                tours={mergedTours}
                traslados={mergedTraslados}
                onUsarPlantilla={(result) => {
                  handleUsarPlantilla(result);
                  refreshPlantillasCount();
                }}
              />
            </div>
          ) : view === "descriptivos" ? (
            <div className="space-y-6">
              <ModuleRibbon title="DESCRIPTIVOS" rightSlot={bellSlot} />
              <Descriptivos
                apiDescriptivos={descriptivos}
                onChanged={handleDescriptivosChanged}
              />
            </div>
          ) : view === "tarifas" ? (
            <div className="space-y-6">
              <ModuleRibbon title="TARIFAS" rightSlot={bellSlot} />
              <Tarifas
                apiHoteles={hoteles}
                apiTours={tours}
                apiTraslados={traslados}
                apiHotelesBrasil={hotelesBrasil}
                apiToursBrasil={toursBrasil}
                apiTrasladosBrasil={trasladosBrasil}
                onChanged={handleTarifasChanged}
                onUpload={handleUpload}
                fileInfo={fileInfo}
                onReload={handleTarifarioReload}
                fileInfoBrasil={fileInfoBrasil}
                onReloadBrasil={handleTarifarioReloadBrasil}
                onUploadBrasil={handleUploadBrasil}
                fileInfoEn={fileInfoEn}
                onReloadEn={handleTarifarioReloadEn}
                onUploadEn={handleUploadEn}
                fileInfoPt={fileInfoPt}
                onReloadPt={handleTarifarioReloadPt}
                onUploadPt={handleUploadPt}
              />
            </div>
          ) : view === "respaldos" ? (
            <div className="space-y-6">
              <ModuleRibbon title="RESPALDOS" rightSlot={bellSlot} />
              <Respaldos
                onImported={() => {
                  handleTarifasChanged();
                  handleDescriptivosChanged();
                  refreshPlantillasCount();
                }}
              />
            </div>
          ) : (
            <div className="space-y-6">
              <ModuleRibbon title="COTIZADOR" rightSlot={bellSlot} />
            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_420px] gap-6">
              <div className="space-y-6 min-w-0">
                <ClientForm
                  cliente={cliente}
                  onChange={handleClienteChange}
                  errors={validationErrors}
                />
                <AlojamientoBar
                  cliente={cliente}
                  onClienteChange={handleClienteChange}
                  acomodaciones={acomodaciones}
                  onAcomodacionesChange={setAcomodaciones}
                  quotingMode={quotingMode}
                  habitacionesPorAcomodacion={habitacionesPorAcomodacion}
                  onHabitacionesChange={setHabitacionesPorAcomodacion}
                  result={result}
                  ninos={cliente.ninos ?? 0}
                  adultos={cliente.pasajeros ?? 0}
                  onShowToast={showToast}
                />
                <AgregarServicioButtons onOpenCustom={() => setCustomOpen(true)} />
                <ServiciosSeleccionados
                  servicios={servicios}
                  acomodaciones={acomodaciones}
                  pasajeros={cliente.pasajeros}
                  ninos={cliente.ninos ?? 0}
                  highlightedId={highlightedServiceId}
                  onChange={setServicios}
                  onEdit={openEdit}
                  onAddCustom={() => setCustomOpen(true)}
                  onCargarPlantilla={handleCargarPlantillaEnCotizacion}
                  onEditarPlantilla={() => {
                    refreshPlantillasCount();
                    setView("plantillas");
                  }}
                  observaciones={observacionManual}
                  onObservacionesChange={setObservacionManual}
                  personalizarTraslados={personalizarTraslados}
                  presentationMode={presentationMode}
                  opcionesPaquete={opcionesPaquete}
                  activeOpcionPaquete={activeOpcionPaquete}
                  onActiveOpcionChange={setActiveOpcionPaquete}
                  onAddOpcion={handleAddOpcion}
                  onRenameOpcion={handleRenameOpcion}
                  onDeleteOpcion={handleDeleteOpcion}
                />
                {incluirItinerario && (
                  <Itinerario
                    cliente={cliente}
                    servicios={servicios}
                    incluirDescriptivos={incluirDescriptivos}
                    actividadesOverride={actividadesOverride}
                    onActividadesOverrideChange={setActividadesOverride}
                  />
                )}
              </div>

              <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
                <ConfiguracionPanel
                  modo={modo}
                  onModoChange={setModo}
                  presentationMode={presentationMode}
                  onPresentationModeChange={setPresentationMode}
                  quotingMode={quotingMode}
                  onQuotingModeChange={handleQuotingModeChange}
                  incluirItinerario={incluirItinerario}
                  onToggleItinerario={() => setIncluirItinerario((v) => !v)}
                  incluirDescriptivos={incluirDescriptivos}
                  onToggleDescriptivos={() =>
                    setIncluirDescriptivos((v) => !v)
                  }
                  incluirDescriptivoCompleto={incluirDescriptivoCompleto}
                  onToggleDescriptivoCompleto={() =>
                    setIncluirDescriptivoCompleto((v) => !v)
                  }
                  personalizarTraslados={personalizarTraslados}
                  onTogglePersonalizarTraslados={() =>
                    setPersonalizarTraslados((v) => !v)
                  }
                  idioma={idioma}
                  onIdiomaChange={setIdioma}
                />
                <ExportButtons
                  cliente={cliente}
                  servicios={servicios}
                  result={result}
                  modo={modo}
                  presentationMode={presentationMode}
                  quotingMode={quotingMode}
                  habitacionesPorAcomodacion={habitacionesPorAcomodacion}
                  incluirItinerario={incluirItinerario}
                  incluirDescriptivos={incluirDescriptivos}
                  incluirDescriptivoCompleto={incluirDescriptivoCompleto}
                  personalizarTraslados={personalizarTraslados}
                  descriptivos={mergedDescriptivos}
                  actividadesOverride={actividadesOverride}
                  observaciones={resolvedObservaciones}
                  onClear={handleClear}
                  onPreview={() => {
                    getOrCreateNumero();
                    setPreviewQuote(null);
                    setPreviewOpen(true);
                  }}
                  onActionComplete={handleActionComplete}
                  validateBeforeAction={validateBeforeAction}
                  onSaveToSeguimiento={() => handleSave({ silent: true })}
                  getNumeroCotizacion={getOrCreateNumero}
                  idioma={idioma}
                  opcionesPaquete={opcionesPaquete}
                />
                {servicios.length > 0 && (
                  <button
                    type="button"
                    onClick={handleGuardarComoPlantilla}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-dashed border-slate-300 text-slate-500 hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all text-xs font-medium"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><line x1="3" x2="21" y1="9" y2="9"/><line x1="3" x2="21" y1="15" y2="15"/><line x1="9" x2="9" y1="9" y2="21"/></svg>
                    Guardar cotización como plantilla
                  </button>
                )}
              </aside>
            </div>
            </div>
          )}
        </div>

        <footer className="px-6 lg:px-10 py-6 text-center text-xs text-muted-foreground">
          RGE Style Travel · Cotizador 2026
        </footer>
      </main>

      <CustomItemModal
        open={customOpen}
        onClose={() => {
          setCustomOpen(false);
          setCustomEditing(null);
        }}
        onSave={(s) => {
          handleQuickAdd(s);
          setCustomEditing(null);
        }}
        globalFechaInicio={cliente.fechaInicio}
        globalFechaFin={cliente.fechaFin}
        globalNinos={cliente.ninos}
        initial={customEditing}
      />

      <ServicioFormModal
        open={form.open}
        onClose={() => setForm(CLOSED_FORM)}
        tipo={form.tipo}
        isManual={form.isManual}
        allowTipoSwitch={form.allowSwitch}
        hoteles={mergedHoteles}
        tours={mergedTours}
        traslados={mergedTraslados}
        initial={form.initial}
        globalPasajeros={cliente.pasajeros}
        globalFechaInicio={cliente.fechaInicio}
        globalFechaFin={cliente.fechaFin}
        onSave={handleFormSave}
      />

      <VistaPreviaModal
        open={previewOpen}
        onClose={closePreview}
        cliente={previewCliente}
        servicios={previewServicios}
        result={previewResult}
        modo={previewModo}
        presentationMode={presentationMode}
        quotingMode={quotingMode}
        habitacionesPorAcomodacion={habitacionesPorAcomodacion}
        incluirItinerario={incluirItinerario}
        incluirDescriptivos={incluirDescriptivos}
        incluirDescriptivoCompleto={incluirDescriptivoCompleto}
        descriptivos={mergedDescriptivos}
        actividadesOverride={actividadesOverride}
        onActividadesOverrideChange={setActividadesOverride}
        numeroCotizacion={previewNumero}
        idioma={idioma}
        opcionesPaquete={previewQuote?.opcionesPaquete ?? opcionesPaquete}
        observaciones={previewQuote
          ? resolveObservaciones(
              observacionesCatalog,
              previewQuote.observacionesSeleccionadas ?? [],
              previewQuote.observacionManual ?? "",
            )
          : resolvedObservaciones}
      />

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

type CategoriaServicio = "hoteleria" | "traslados" | "aereos" | "catamaran" | "tours" | "otros";

const CATEGORIAS_SERVICIO: { id: CategoriaServicio; label: string; icon: React.ReactNode }[] = [
  { id: "hoteleria",  label: "Hotelería",  icon: <BedDouble className="w-5 h-5" /> },
  { id: "traslados",  label: "Traslados",  icon: <Car className="w-5 h-5" /> },
  { id: "aereos",     label: "Aéreos",     icon: <Plane className="w-5 h-5" /> },
  { id: "catamaran",  label: "Catamarán",  icon: <Anchor className="w-5 h-5" /> },
  { id: "tours",      label: "Tours",      icon: <Compass className="w-5 h-5" /> },
  { id: "otros",      label: "Otros",      icon: <Package className="w-5 h-5" /> },
];

function AgregarServicioButtons({ onOpenCustom }: { onOpenCustom: () => void }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-3 px-1">
        Agregar servicio
      </p>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {CATEGORIAS_SERVICIO.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={onOpenCustom}
            className="flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-xl border border-[#e8d5e0] bg-[#fdf7fb] transition-all text-center group"
            style={{ color: "#802d62" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#f9f0f5";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "#b78ca4";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#fdf7fb";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "#e8d5e0";
            }}
          >
            <span className="leading-none" style={{ color: "#802d62" }}>{cat.icon}</span>
            <span className="text-[11px] font-semibold leading-tight">{cat.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ModuleRibbon({
  title,
  rightSlot,
}: {
  title: string;
  rightSlot?: React.ReactNode;
}) {
  return (
    <div
      className="flex items-center gap-3 px-5 py-3 rounded-2xl"
      style={{
        backgroundColor: "rgba(128,45,98,0.92)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 2px 12px rgba(128,45,98,0.18)",
      }}
    >
      <div className="w-[3px] h-5 rounded-full flex-shrink-0" style={{ backgroundColor: "#eec774" }} />
      <span style={{ color: "#ffffff", fontSize: 20, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>{title}</span>
      {rightSlot && <div className="ml-auto">{rightSlot}</div>}
    </div>
  );
}
