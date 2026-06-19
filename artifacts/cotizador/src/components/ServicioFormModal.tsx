import { useEffect, useMemo, useRef, useState } from "react";
import { compressImage } from "@/lib/image-utils";
import { PriceInput } from "@/components/ui/price-input";
import PremiumSingleDatePicker from "./PremiumSingleDatePicker";
import {
  Search,
  Hotel as HotelIcon,
  Bus,
  MapPin,
  Calendar,
  Users,
  Tag,
  StickyNote,
  Clock,
  X,
  Check,
  ImageIcon,
} from "lucide-react";
import Modal from "./Modal";
import type {
  Hotel,
  ServicioSeleccionado,
  Tier,
  Tour,
  Traslado,
} from "@/lib/types";
import { fmt, pickTier, priceForTier, tierLabel, diffNoches, addDays } from "@/lib/calc";

export type ServicioTipo = "hotel" | "tour" | "traslado";

function formatNotaText(raw: string): string {
  const lines: string[] = [];
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    for (const part of trimmed.split(/(?<=\.)\s+|(?<=;)\s+/)) {
      const p = part.trim();
      if (p) lines.push(p);
    }
  }
  return lines.join("\n");
}

interface Props {
  open: boolean;
  onClose: () => void;
  tipo: ServicioTipo;
  /** When true, hide catalog and fill manually. */
  isManual?: boolean;
  /** Allow user to switch type within the modal (Personalizado flow). */
  allowTipoSwitch?: boolean;
  hoteles: Hotel[];
  tours: Tour[];
  traslados: Traslado[];
  /** Existing service when editing. */
  initial?: ServicioSeleccionado | null;
  globalPasajeros: number;
  globalFechaInicio: string;
  globalFechaFin: string;
  onSave: (s: ServicioSeleccionado) => void;
}

interface CatalogItem {
  id: string;
  label: string;
  raw: Hotel | Tour | Traslado;
}

export default function ServicioFormModal(props: Props) {
  const {
    open,
    onClose,
    isManual,
    allowTipoSwitch,
    hoteles,
    tours,
    traslados,
    initial,
    globalPasajeros,
    globalFechaInicio,
    globalFechaFin,
    onSave,
  } = props;

  // Allow tipo to be local state when "Personalizado" or editing
  const [tipo, setTipo] = useState<ServicioTipo>(props.tipo);
  const [codigo, setCodigo] = useState("");
  const [nombre, setNombre] = useState("");
  const [notas, setNotas] = useState("");
  const [notesImportant, setNotesImportant] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [ubicacion, setUbicacion] = useState("");
  const [estrellas, setEstrellas] = useState("");
  const [vigencia, setVigencia] = useState("");
  const [aplicarVigencia, setAplicarVigencia] = useState(false);
  const [tipoHabitacion, setTipoHabitacion] = useState("");
  // Hotel
  const [precios, setPrecios] = useState({
    SGL: 0,
    DBL: 0,
    TPL: 0,
    CHD: 0,
    p1: 0,
    p2_5: 0,
    p6_10: 0,
    chd: 0,
  });
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  // Tour/traslado
  const [usarFecha, setUsarFecha] = useState(false);
  const [fecha, setFecha] = useState("");
  const [paxMode, setPaxMode] = useState<"auto" | "manual">("auto");
  const [paxValue, setPaxValue] = useState<number>(globalPasajeros);
  const [tarifaOverride, setTarifaOverride] = useState<Tier | "auto">("auto");
  const [unitOverride, setUnitOverride] = useState<number | null>(null);
  // Tour-only schedule captured from catalog
  const [horario, setHorario] = useState<string>("");
  // Hotel-only: meal plan / régimen
  const [desayuno, setDesayuno] = useState<string>("");
  // Tour/traslado/vuelo modalidad
  const [tipoServicio, setTipoServicio] = useState<"Regular" | "Privado">("Regular");
  // Catalog selection
  const [search, setSearch] = useState("");
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTipo(props.tipo);
    setSearch("");
    if (initial) {
      // Hydrate from existing service
      setCodigo(initial.codigo ?? initial.id);
      setNombre(initial.nombre);
      setNotas(initial.notas ?? "");
      setNotesImportant(initial.notesImportant ?? false);
      setImages(initial.images ?? []);
      setUbicacion(initial.ubicacion ?? "");
      setEstrellas(initial.estrellas ?? "");
      setVigencia(initial.vigencia ?? "");
      setAplicarVigencia(!!initial.vigencia);
      setTipoHabitacion(initial.tipoHabitacion ?? "");
      setPrecios({
        SGL: initial.precios.SGL ?? 0,
        DBL: initial.precios.DBL ?? 0,
        TPL: initial.precios.TPL ?? 0,
        CHD: initial.precios.CHD ?? initial.precios.chd ?? 0,
        p1: initial.precios.p1 ?? 0,
        p2_5: initial.precios.p2_5 ?? 0,
        p6_10: initial.precios.p6_10 ?? 0,
        chd: initial.precios.chd ?? initial.precios.CHD ?? 0,
      });
      setFechaInicio(initial.fechaInicio ?? "");
      setFechaFin(initial.fechaFin ?? "");
      setUsarFecha(!!initial.usarFecha);
      setFecha(initial.fecha ?? "");
      setPaxMode(initial.paxOverride ? "manual" : "auto");
      setPaxValue(initial.paxOverride ?? globalPasajeros);
      setTarifaOverride(initial.tarifaOverride ?? "auto");
      setUnitOverride(
        typeof initial.unitOverride === "number" ? initial.unitOverride : null,
      );
      setHorario(initial.horario ?? "");
      setDesayuno(initial.desayuno ?? "");
      setTipoServicio(initial.tipoServicio ?? "Regular");
      setSelectedCatId(initial.manual ? null : initial.id);
    } else {
      // Fresh
      setCodigo("");
      setNombre("");
      setNotas("");
      setNotesImportant(false);
      setImages([]);
      setUbicacion("");
      setEstrellas("");
      setVigencia("");
      setAplicarVigencia(false);
      setPrecios({
        SGL: 0,
        DBL: 0,
        TPL: 0,
        CHD: 0,
        p1: 0,
        p2_5: 0,
        p6_10: 0,
        chd: 0,
      });
      setFechaInicio(globalFechaInicio);
      setFechaFin(globalFechaFin);
      setUsarFecha(false);
      setFecha(globalFechaInicio);
      setPaxMode("auto");
      setPaxValue(globalPasajeros);
      setTarifaOverride("auto");
      setUnitOverride(null);
      setHorario("");
      setDesayuno("");
      setTipoServicio("Regular");
      setSelectedCatId(null);
      setTipoHabitacion("");
    }
  }, [open, props.tipo, initial, globalPasajeros, globalFechaInicio, globalFechaFin]);

  const catalogItems: CatalogItem[] = useMemo(() => {
    if (isManual) return [];
    if (tipo === "hotel")
      return hoteles.map((h) => ({
        id: h.id,
        label: `${h.id} · ${h.nombre}`,
        raw: h,
      }));
    if (tipo === "tour")
      return tours.map((t) => ({
        id: t.id,
        label: `${t.id} · ${t.nombre}`,
        raw: t,
      }));
    return traslados.map((t) => ({
      id: t.id,
      label: `${t.id} · ${t.nombre}`,
      raw: t,
    }));
  }, [tipo, hoteles, tours, traslados, isManual]);

  const filteredCatalog = useMemo(() => {
    if (!search) return catalogItems.slice(0, 80);
    const q = search.toLowerCase();
    return catalogItems
      .filter((c) => c.label.toLowerCase().includes(q))
      .slice(0, 80);
  }, [catalogItems, search]);

  const pickFromCatalog = (item: CatalogItem) => {
    setSelectedCatId(item.id);
    setCodigo(item.id);
    setNombre(item.raw.nombre);
    if (tipo === "hotel") {
      const h = item.raw as Hotel;
      setUbicacion(h.ubicacion);
      setEstrellas(h.estrellas);
      setVigencia(h.vigencia);
      setTipoHabitacion(h.tipoHabitacion || "");
      setDesayuno(h.desayuno || "");
      setPrecios((p) => ({
        ...p,
        SGL: h.precios.SGL,
        DBL: h.precios.DBL,
        TPL: h.precios.TPL,
        CHD: h.precios.CHD,
        chd: h.precios.CHD,
      }));
    } else {
      const t = item.raw as Tour | Traslado;
      setPrecios((p) => ({
        ...p,
        p1: t.precios.p1,
        p2_5: t.precios.p2_5,
        p6_10: t.precios.p6_10,
        chd: t.precios.chd,
      }));
      setUnitOverride(null);
      if (tipo === "tour") {
        const h = (t as Tour).horario?.trim();
        setHorario(h || "");
      }
    }
    setSearch("");
  };

  const clearCatalog = () => {
    setSelectedCatId(null);
    setCodigo("");
    setNombre("");
    setUbicacion("");
    setEstrellas("");
    setVigencia("");
    setPrecios({
      SGL: 0,
      DBL: 0,
      TPL: 0,
      CHD: 0,
      p1: 0,
      p2_5: 0,
      p6_10: 0,
      chd: 0,
    });
    setHorario("");
  };

  const paxLocal = paxMode === "manual" ? Math.max(1, paxValue) : globalPasajeros;
  const autoTier = pickTier(paxLocal);
  const appliedTier: Tier =
    tarifaOverride === "auto" ? autoTier : (tarifaOverride as Tier);
  const unitAuto =
    tipo === "hotel" ? 0 : priceForTier(precios, appliedTier);
  const unitAplicado =
    tipo === "hotel"
      ? 0
      : unitOverride !== null
        ? unitOverride
        : unitAuto;

  const canSave = nombre.trim().length > 0;

  const handleSave = () => {
    if (!canSave) return;
    const isCatalog = !!selectedCatId && !isManual;
    const id = isCatalog ? selectedCatId! : initial?.id ?? `MAN-${Date.now()}`;
    const base: ServicioSeleccionado = {
      id,
      codigo: codigo || id,
      tipo,
      nombre,
      notas: notas || undefined,
      notesImportant: notesImportant && !!notas.trim() ? true : undefined,
      images: images.length > 0 ? images : undefined,
      paxOverride: paxMode === "manual" ? paxValue : undefined,
      manual: !isCatalog,
      precios:
        tipo === "hotel"
          ? {
              SGL: precios.SGL,
              DBL: precios.DBL,
              TPL: precios.TPL,
              CHD: precios.CHD,
              chd: precios.CHD,
            }
          : {
              p1: precios.p1,
              p2_5: precios.p2_5,
              p6_10: precios.p6_10,
              chd: precios.chd,
              CHD: precios.chd,
            },
    };
    if (tipo === "hotel") {
      base.fechaInicio = fechaInicio || undefined;
      base.fechaFin = fechaFin || undefined;
      base.ubicacion = ubicacion || undefined;
      base.estrellas = estrellas || undefined;
      base.vigencia = aplicarVigencia ? vigencia || undefined : undefined;
      base.tipoHabitacion = tipoHabitacion || undefined;
      base.desayuno = desayuno || undefined;
    } else {
      base.usarFecha = usarFecha;
      if (usarFecha) base.fecha = fecha || undefined;
      if (tarifaOverride !== "auto")
        base.tarifaOverride = tarifaOverride as Tier;
      if (unitOverride !== null) base.unitOverride = unitOverride;
      base.tipoServicio = tipoServicio;
    }
    if (tipo === "tour" && horario.trim()) {
      base.horario = horario.trim();
    }
    onSave(base);
  };

  const titleByTipo = {
    hotel: isManual ? "Alojamiento personalizado" : "Agregar alojamiento",
    tour: isManual ? "Tour personalizado" : "Agregar tour / actividad",
    traslado: isManual ? "Traslado personalizado" : "Agregar traslado",
  } as const;

  const editTitleByTipo = {
    hotel: "Editar alojamiento",
    tour: "Editar tour / actividad",
    traslado: "Editar traslado",
  } as const;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? editTitleByTipo[tipo] : titleByTipo[tipo]}
      subtitle={
        initial
          ? nombre || "Configura los detalles del servicio"
          : "Configura los detalles del servicio"
      }
      size="xl"
      titleRight={
        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave}
          title={initial ? "Guardar cambios" : "Guardar servicio"}
          className="w-9 h-9 rounded-xl bg-[#802d62] hover:bg-[#6b2252] text-white flex items-center justify-center shadow-sm transition-colors disabled:opacity-40"
        >
          <Check className="w-4 h-4" />
        </button>
      }
    >
      <div className="px-6 py-5 space-y-5">
        {allowTipoSwitch && !initial && (
          <div>
            <SectionTitle>Tipo de servicio</SectionTitle>
            <div className="grid grid-cols-3 gap-2">
              {(["hotel", "tour", "traslado"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTipo(t)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors flex items-center justify-center gap-2 ${
                    tipo === t
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {t === "hotel" && <HotelIcon className="w-4 h-4" />}
                  {t === "tour" && <MapPin className="w-4 h-4" />}
                  {t === "traslado" && <Bus className="w-4 h-4" />}
                  {t === "hotel" ? "Hotel" : t === "tour" ? "Tour" : "Traslado"}
                </button>
              ))}
            </div>
          </div>
        )}

        {!isManual && !initial && (
          <div>
            <SectionTitle>
              <Search className="w-3.5 h-3.5" /> Buscar en catálogo
            </SectionTitle>
            {selectedCatId ? (
              <div className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-[#eb7309]/5 border border-[#eb7309]/30">
                <div className="min-w-0">
                  <div className="text-[11px] uppercase tracking-wider font-semibold text-[#eb7309]">
                    {selectedCatId}
                  </div>
                  <div className="text-sm font-medium text-slate-900 truncate">
                    {nombre}
                  </div>
                </div>
                <button
                  onClick={clearCatalog}
                  className="p-1.5 rounded-md text-slate-500 hover:bg-white"
                  title="Quitar selección"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar servicio..."
                    className="w-full h-11 pl-10 pr-3 rounded-xl border border-slate-200 text-sm bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#eb7309]/30 focus:border-[#eb7309] shadow-sm"
                  />
                </div>
                <div className="mt-3 max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white">
                  {filteredCatalog.length === 0 ? (
                    <div className="px-4 py-6 text-sm text-slate-500 text-center">
                      No se encontraron servicios
                    </div>
                  ) : (
                    <div className="p-1.5 space-y-1">
                      {filteredCatalog.map((c) => (
                        <CatalogResultRow
                          key={c.id}
                          tipo={tipo}
                          item={c}
                          query={search}
                          onPick={pickFromCatalog}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        <div>
          <SectionTitle>
            <Tag className="w-3.5 h-3.5" /> Detalles del servicio
          </SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label>Código</Label>
              <input
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                placeholder="RGE-XXXX"
                className={inputCls}
              />
            </div>
            <div className="md:col-span-2">
              <Label>Nombre</Label>
              <input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Nombre del servicio"
                className={inputCls}
              />
            </div>
          </div>
        </div>

        {tipo === "hotel" ? (
          <HotelFields
            fechaInicio={fechaInicio}
            fechaFin={fechaFin}
            ubicacion={ubicacion}
            estrellas={estrellas}
            vigencia={vigencia}
            aplicarVigencia={aplicarVigencia}
            tipoHabitacion={tipoHabitacion}
            precios={precios}
            onChange={(patch) => {
              if (patch.fechaInicio !== undefined)
                setFechaInicio(patch.fechaInicio);
              if (patch.fechaFin !== undefined) setFechaFin(patch.fechaFin);
              if (patch.ubicacion !== undefined) setUbicacion(patch.ubicacion);
              if (patch.estrellas !== undefined) setEstrellas(patch.estrellas);
              if (patch.vigencia !== undefined) setVigencia(patch.vigencia);
              if (patch.tipoHabitacion !== undefined)
                setTipoHabitacion(patch.tipoHabitacion);
              if (patch.desayuno !== undefined) setDesayuno(patch.desayuno);
              if (patch.precios)
                setPrecios((p) => ({ ...p, ...patch.precios }));
            }}
            desayuno={desayuno}
            onToggleAplicarVigencia={() => setAplicarVigencia((v) => !v)}
          />
        ) : (
          <TourTrasladoFields
            usarFecha={usarFecha}
            fecha={fecha}
            paxMode={paxMode}
            paxValue={paxValue}
            globalPasajeros={globalPasajeros}
            tarifaOverride={tarifaOverride}
            autoTier={autoTier}
            unitAplicado={unitAplicado}
            unitOverride={unitOverride}
            precios={{
              p1: precios.p1,
              p2_5: precios.p2_5,
              p6_10: precios.p6_10,
              chd: precios.chd,
            }}
            onUsarFecha={setUsarFecha}
            onFecha={setFecha}
            onPaxMode={setPaxMode}
            onPaxValue={setPaxValue}
            onTarifaOverride={setTarifaOverride}
            onUnitOverride={setUnitOverride}
            onPrecios={(p) => setPrecios((prev) => ({ ...prev, ...p }))}
            isManual={!!isManual}
          />
        )}

        {tipo !== "hotel" && (
          <div>
            <SectionTitle>Modalidad</SectionTitle>
            <div className="flex gap-2">
              {(["Regular", "Privado"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setTipoServicio(m)}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    tipoServicio === m
                      ? m === "Privado"
                        ? "bg-[#802d62] text-white border-[#802d62]"
                        : "bg-emerald-600 text-white border-emerald-600"
                      : "border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        )}

        {tipo === "tour" && (
          <div>
            <SectionTitle>
              <Clock className="w-3.5 h-3.5" /> Horario
            </SectionTitle>
            <input
              type="text"
              value={horario}
              onChange={(e) => setHorario(e.target.value)}
              placeholder="Ej: Lun a Vie · 09:00 · 4 hs"
              className={inputCls}
            />
            <div className="text-[11px] text-slate-500 mt-1.5">
              Días, hora y duración. Aparece en la propuesta si está activado "Incluir horarios".
            </div>
          </div>
        )}

        <div>
          <SectionTitle>
            <StickyNote className="w-3.5 h-3.5" /> Notas
          </SectionTitle>
          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            onPaste={(e) => {
              const pasted = e.clipboardData.getData("text");
              if (!pasted) return;
              e.preventDefault();
              const formatted = formatNotaText(pasted);
              const ta = e.currentTarget;
              const start = ta.selectionStart ?? 0;
              const end = ta.selectionEnd ?? 0;
              const current = ta.value;
              const before = current.slice(0, start);
              const after = current.slice(end);
              const sep = before && !before.endsWith("\n") ? "\n" : "";
              const newVal = (before + sep + formatted + (after.trim() ? "\n" + after.trim() : "")).trim();
              setNotas(newVal);
            }}
            placeholder="Detalles, restricciones u observaciones para el cliente..."
            rows={3}
            className={`${inputCls} resize-none`}
          />
          {notas.trim() && (
            <label className="flex items-center gap-2 mt-2 cursor-pointer select-none">
              <ToggleSwitch checked={notesImportant} onChange={() => setNotesImportant(v => !v)} />
              <span className={`text-[11px] font-medium transition-colors ${notesImportant ? "text-[#ef7b15]" : "text-slate-500"}`}>
                Marcar como importante
              </span>
            </label>
          )}
        </div>

        <div>
          <SectionTitle>
            <ImageIcon className="w-3.5 h-3.5" /> Imágenes del servicio
          </SectionTitle>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              files.forEach((file) => {
                compressImage(file).then((dataUrl) => {
                  setImages((prev) => [...prev, dataUrl]);
                });
              });
              e.target.value = "";
            }}
          />
          {images.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {images.map((src, idx) => (
                <div key={idx} className="relative group w-20 h-20 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 flex-shrink-0">
                  <img src={src} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setImages((prev) => prev.filter((_, i) => i !== idx))}
                    className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    title="Eliminar imagen"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-dashed border-slate-300 text-sm text-slate-500 hover:border-primary hover:text-primary hover:bg-primary/5 transition-colors"
          >
            <ImageIcon className="w-4 h-4" />
            {images.length > 0 ? "Agregar más imágenes" : "Subir imágenes"}
          </button>
          <div className="text-[11px] text-slate-400 mt-1.5">
            Aparecerán en la propuesta (máx. 3 visibles en PDF y correo)
          </div>
        </div>
      </div>
    </Modal>
  );
}

function HotelFields({
  fechaInicio,
  fechaFin,
  ubicacion,
  estrellas,
  vigencia,
  aplicarVigencia,
  tipoHabitacion,
  desayuno,
  precios,
  onChange,
  onToggleAplicarVigencia,
}: {
  fechaInicio: string;
  fechaFin: string;
  ubicacion: string;
  estrellas: string;
  vigencia: string;
  aplicarVigencia: boolean;
  tipoHabitacion: string;
  desayuno: string;
  precios: { SGL: number; DBL: number; TPL: number; CHD: number };
  onChange: (
    patch: Partial<{
      fechaInicio: string;
      fechaFin: string;
      ubicacion: string;
      estrellas: string;
      vigencia: string;
      tipoHabitacion: string;
      desayuno: string;
      precios: Partial<{ SGL: number; DBL: number; TPL: number; CHD: number }>;
    }>,
  ) => void;
  onToggleAplicarVigencia: () => void;
}) {
  const noches = useMemo(() => diffNoches(fechaInicio, fechaFin), [fechaInicio, fechaFin]);

  return (
    <>
      {/* ── Estadía ── */}
      <div>
        <SectionTitle>
          <Calendar className="w-3.5 h-3.5" /> Estadía
        </SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Check-in</Label>
            <PremiumSingleDatePicker
              value={fechaInicio}
              onChange={(iso) => {
                const patch: Parameters<typeof onChange>[0] = { fechaInicio: iso };
                if (iso) {
                  if (!fechaFin || fechaFin <= iso) {
                    patch.fechaFin = addDays(iso, Math.max(1, noches));
                  }
                }
                onChange(patch);
              }}
              placeholder="Check-in"
              allowPast
            />
          </div>
          <div>
            <Label>Check-out</Label>
            <PremiumSingleDatePicker
              value={fechaFin}
              onChange={(iso) => onChange({ fechaFin: iso })}
              placeholder="Check-out"
              allowPast
              minDate={fechaInicio || undefined}
            />
          </div>
        </div>

        {/* Noches summary + editable field */}
        <div className="mt-2 flex items-center gap-3">
          <div
            className="flex items-center gap-2 rounded-lg px-3 py-1.5"
            style={{ background: "rgba(128,45,98,0.07)", border: "1px solid rgba(128,45,98,0.18)" }}
          >
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#802d62" }}>
              Noches
            </span>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={noches === 0 ? "" : String(noches)}
              placeholder="0"
              onChange={(e) => {
                const raw = e.target.value.replace(/[^0-9]/g, "");
                if (!raw) return;
                const n = parseInt(raw, 10);
                if (!Number.isFinite(n) || n <= 0 || !fechaInicio) return;
                onChange({ fechaFin: addDays(fechaInicio, n) });
              }}
              className="w-10 text-center text-sm font-bold focus:outline-none bg-transparent"
              style={{ color: "#802d62" }}
            />
          </div>
          {fechaInicio && fechaFin && (
            <span className="text-xs text-slate-400">
              {fechaInicio.split("-").reverse().join("/")} → {fechaFin.split("-").reverse().join("/")}
            </span>
          )}
        </div>
      </div>

      {/* ── Propiedad ── */}
      <div>
        <SectionTitle>Propiedad</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <Label>Ubicación</Label>
            <select
              value={ubicacion}
              onChange={(e) => onChange({ ubicacion: e.target.value })}
              className={selectCls}
              style={{ color: ubicacion ? "#0f172a" : "#94a3b8" }}
            >
              <option value="">— Seleccionar —</option>
              <option value="BOCAS DEL TORO">BOCAS DEL TORO</option>
              <option value="CHIRIQUÍ">CHIRIQUÍ</option>
              <option value="CIUDAD DE PANAMÁ">CIUDAD DE PANAMÁ</option>
              <option value="COCLÉ (RIVIERA PACÍFICA)">COCLÉ (RIVIERA PACÍFICA)</option>
              <option value="COLÓN">COLÓN</option>
              <option value="CONTADORA">CONTADORA</option>
              <option value="SAN BLAS">SAN BLAS</option>
              <option value="TABOGA">TABOGA</option>
              <option value="VERAGUAS / SANTIAGO">VERAGUAS / SANTIAGO</option>
            </select>
          </div>
          <div>
            <Label>Categoría</Label>
            <select
              value={estrellas}
              onChange={(e) => onChange({ estrellas: e.target.value })}
              className={selectCls}
              style={{ color: estrellas ? "#0f172a" : "#94a3b8" }}
            >
              <option value="">— Seleccionar —</option>
              <option value="★★★">★★★</option>
              <option value="★★★★">★★★★</option>
              <option value="★★★★★">★★★★★</option>
            </select>
          </div>
          <div>
            <Label>Tipo de Habitación</Label>
            <input
              list="tipos-habitacion"
              value={tipoHabitacion}
              onChange={(e) => onChange({ tipoHabitacion: e.target.value })}
              placeholder="Standard, Deluxe, Suite..."
              className={inputCls}
            />
            <datalist id="tipos-habitacion">
              <option value="Standard" />
              <option value="Deluxe" />
              <option value="Suite" />
              <option value="Junior Suite" />
              <option value="Vista Jardín" />
              <option value="Vista Mar" />
            </datalist>
          </div>
        </div>
      </div>

      {/* ── Régimen y Vigencia ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Label>Régimen / Desayuno</Label>
          <input
            list="regimenes"
            value={desayuno}
            onChange={(e) => onChange({ desayuno: e.target.value })}
            placeholder="Ej: Desayuno buffet incluido"
            className={inputCls}
          />
          <datalist id="regimenes">
            <option value="Solo alojamiento" />
            <option value="Desayuno continental incluido" />
            <option value="Desayuno buffet incluido" />
            <option value="Alimentación completa incluida" />
            <option value="Todo incluido" />
          </datalist>
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <Label>Vigencia</Label>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <span
                className={`text-[11px] font-medium transition-colors ${
                  aplicarVigencia ? "text-primary" : "text-slate-500"
                }`}
              >
                Aplicar
              </span>
              <ToggleSwitch
                checked={aplicarVigencia}
                onChange={onToggleAplicarVigencia}
              />
            </label>
          </div>
          <input
            value={vigencia}
            onChange={(e) => onChange({ vigencia: e.target.value })}
            placeholder={aplicarVigencia ? "Ej: 01/04 al 30/09" : "Activa el toggle"}
            disabled={!aplicarVigencia}
            className={`${inputCls} transition-all ${
              !aplicarVigencia
                ? "bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200"
                : ""
            }`}
          />
        </div>
      </div>

      {/* ── Precios ── */}
      <div>
        <SectionTitle>Precios por acomodación (por noche)</SectionTitle>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(["SGL", "DBL", "TPL", "CHD"] as const).map((a) => (
            <div key={a}>
              <Label>{a}</Label>
              <PriceInput
                value={String(precios[a])}
                onChange={(v) => onChange({ precios: { [a]: v === "" ? 0 : Number(v) } })}
                wrapperClassName="w-full"
                inputClassName="w-full pr-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-slate-400"
              />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function TourTrasladoFields({
  usarFecha,
  fecha,
  paxMode,
  paxValue,
  globalPasajeros,
  tarifaOverride,
  autoTier,
  unitAplicado,
  unitOverride,
  precios,
  onUsarFecha,
  onFecha,
  onPaxMode,
  onPaxValue,
  onTarifaOverride,
  onUnitOverride,
  onPrecios,
  isManual,
}: {
  usarFecha: boolean;
  fecha: string;
  paxMode: "auto" | "manual";
  paxValue: number;
  globalPasajeros: number;
  tarifaOverride: Tier | "auto";
  autoTier: Tier;
  unitAplicado: number;
  unitOverride: number | null;
  precios: { p1: number; p2_5: number; p6_10: number; chd: number };
  onUsarFecha: (b: boolean) => void;
  onFecha: (s: string) => void;
  onPaxMode: (m: "auto" | "manual") => void;
  onPaxValue: (n: number) => void;
  onTarifaOverride: (t: Tier | "auto") => void;
  onUnitOverride: (n: number | null) => void;
  onPrecios: (p: Partial<{ p1: number; p2_5: number; p6_10: number; chd: number }>) => void;
  isManual: boolean;
}) {
  return (
    <>
      <div>
        <SectionTitle>
          <Calendar className="w-3.5 h-3.5" /> Fecha del servicio
        </SectionTitle>
        <div className="flex items-start gap-3 mb-3">
          <ToggleSwitch
            checked={usarFecha}
            onChange={() => onUsarFecha(!usarFecha)}
          />
          <div>
            <div className="text-sm font-medium text-slate-900">Usar fecha</div>
            <div className="text-[11px] text-slate-500">
              Activa para asignar un día específico al servicio
            </div>
          </div>
        </div>
        {usarFecha && (
          <PremiumSingleDatePicker
            value={fecha}
            onChange={onFecha}
            placeholder="Seleccionar fecha"
            allowPast
          />
        )}
      </div>

      <div>
        <SectionTitle>
          <Users className="w-3.5 h-3.5" /> Pasajeros para este servicio
        </SectionTitle>
        <div className="flex items-center gap-2 mb-2">
          <button
            onClick={() => onPaxMode("auto")}
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border ${
              paxMode === "auto"
                ? "bg-slate-900 text-white border-slate-900"
                : "border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
          >
            Auto · {globalPasajeros} pax
          </button>
          <button
            onClick={() => onPaxMode("manual")}
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border ${
              paxMode === "manual"
                ? "bg-slate-900 text-white border-slate-900"
                : "border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
          >
            Manual
          </button>
        </div>
        {paxMode === "manual" && (
          <input
            type="text"
            inputMode="numeric"
            value={String(paxValue)}
            onChange={(e) => {
              const sanitized = e.target.value.replace(/[^0-9]/g, "");
              onPaxValue(Math.max(1, sanitized === "" ? 1 : Number(sanitized)));
            }}
            onFocus={(e) => e.target.select()}
            placeholder="Cantidad de personas"
            className={inputCls}
          />
        )}
      </div>

      <div>
        <SectionTitle>
          <Tag className="w-3.5 h-3.5" /> Tarifa aplicada
        </SectionTitle>
        <div className="rounded-2xl bg-slate-50 p-4 mb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">
              Total por persona ($ p/p)
            </span>
            {unitOverride !== null && (
              <button
                type="button"
                onClick={() => onUnitOverride(null)}
                className="text-[10px] uppercase tracking-wide text-primary font-semibold hover:underline"
                title="Volver al valor automático del tarifario"
              >
                Restablecer
              </button>
            )}
          </div>
          <div className="grid grid-cols-[7fr_3fr] gap-2 items-stretch">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-semibold text-base pointer-events-none">
                $
              </span>
              <input
                type="text"
                inputMode="numeric"
                value={String(unitAplicado)}
                onChange={(e) => {
                  const sanitized = e.target.value.replace(/[^0-9]/g, "");
                  onUnitOverride(sanitized === "" ? 0 : Number(sanitized));
                }}
                onFocus={(e) => e.target.select()}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === "Escape") {
                    e.preventDefault();
                    (e.target as HTMLInputElement).blur();
                  }
                }}
                className="w-full h-11 pl-7 pr-3 rounded-xl border border-slate-300 text-base font-bold text-slate-900 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                style={{ color: "#1f2937" }}
              />
            </div>
            <select
              value={tarifaOverride}
              onChange={(e) => onTarifaOverride(e.target.value as Tier | "auto")}
              className="w-full h-11 px-3 rounded-xl border border-slate-300 text-sm font-medium bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/40"
              style={{ color: "#1f2937", backgroundColor: "#ffffff" }}
            >
              <option value="auto">Auto · {tierLabel(autoTier)}</option>
              <option value="p1">1 pax</option>
              <option value="p2_5">2-5 pax</option>
              <option value="p6_10">6-10 pax</option>
            </select>
          </div>
          <div className="mt-2 text-[10px] text-slate-500">
            {unitOverride !== null
              ? "Tarifa editada manualmente · no cambiará al modificar el rango"
              : `Autocompletado desde el tarifario (${tierLabel(autoTier)})`}
          </div>
        </div>
        {isManual && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <Label>1 pax</Label>
              <PriceInput
                value={String(precios.p1)}
                onChange={(v) => onPrecios({ p1: v === "" ? 0 : Number(v) })}
                wrapperClassName="w-full"
                inputClassName="w-full pr-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-slate-400"
              />
            </div>
            <div>
              <Label>2-5 pax</Label>
              <PriceInput
                value={String(precios.p2_5)}
                onChange={(v) => onPrecios({ p2_5: v === "" ? 0 : Number(v) })}
                wrapperClassName="w-full"
                inputClassName="w-full pr-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-slate-400"
              />
            </div>
            <div>
              <Label>6-10 pax</Label>
              <PriceInput
                value={String(precios.p6_10)}
                onChange={(v) => onPrecios({ p6_10: v === "" ? 0 : Number(v) })}
                wrapperClassName="w-full"
                inputClassName="w-full pr-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-slate-400"
              />
            </div>
            <div>
              <Label>Niño</Label>
              <PriceInput
                value={String(precios.chd)}
                onChange={(v) => onPrecios({ chd: v === "" ? 0 : Number(v) })}
                wrapperClassName="w-full"
                inputClassName="w-full pr-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-slate-400"
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function ToggleSwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      role="switch"
      aria-checked={checked}
      className={`relative w-9 h-5 rounded-full mt-0.5 flex-shrink-0 transition-colors ${
        checked ? "bg-primary" : "bg-slate-300"
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-4" : ""
        }`}
      />
    </button>
  );
}

const inputCls =
  "w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-slate-400";

const selectCls =
  "w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 appearance-none cursor-pointer";

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[11px] font-semibold text-slate-600 mb-1 uppercase tracking-wide">
      {children}
    </label>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
      {children}
    </h4>
  );
}

function highlight(text: string, query: string) {
  const q = query.trim();
  if (!q) return text;
  const lower = text.toLowerCase();
  const lq = q.toLowerCase();
  const idx = lower.indexOf(lq);
  if (idx < 0) return text;
  return (
    <>
      {text.slice(0, idx)}
      <span className="font-bold text-[#eb7309]">
        {text.slice(idx, idx + q.length)}
      </span>
      {text.slice(idx + q.length)}
    </>
  );
}

function CatalogResultRow({
  tipo,
  item,
  query,
  onPick,
}: {
  tipo: ServicioTipo;
  item: CatalogItem;
  query: string;
  onPick: (item: CatalogItem) => void;
}) {
  const Icon =
    tipo === "hotel" ? HotelIcon : tipo === "tour" ? MapPin : Bus;
  const iconColors =
    tipo === "hotel"
      ? "bg-amber-50 text-amber-600"
      : tipo === "tour"
        ? "bg-emerald-50 text-emerald-600"
        : "bg-[#fdf4f9] text-[#802d62]";

  let rightContent: React.ReactNode = null;
  let metaLine = "";

  if (tipo === "hotel") {
    const h = item.raw as Hotel;
    metaLine = [item.id, h.vigencia].filter(Boolean).join(" · ");
    const stars = parseInt(h.estrellas) || 0;
    rightContent = (
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        {stars > 0 && (
          <div className="text-amber-500 text-xs leading-none">
            {"★".repeat(Math.min(stars, 5))}
          </div>
        )}
        <div className="text-[11px] text-slate-600 font-medium tabular-nums whitespace-nowrap">
          DBL: {fmt(h.precios.DBL)} · SGL: {fmt(h.precios.SGL)}
        </div>
      </div>
    );
  } else {
    const t = item.raw as Tour | Traslado;
    metaLine = item.id;
    rightContent = (
      <div className="text-[11px] text-slate-600 font-medium tabular-nums whitespace-nowrap flex-shrink-0">
        2-5: {fmt(t.precios.p2_5)} · 1: {fmt(t.precios.p1)}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onPick(item)}
      className="w-full flex items-center gap-3 p-3 rounded-xl text-left hover:bg-[#f9fafb] transition-colors"
    >
      <div
        className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${iconColors}`}
      >
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-slate-900 truncate">
          {highlight(item.raw.nombre, query)}
        </div>
        <div className="text-[11px] text-slate-500 truncate mt-0.5">
          {metaLine}
        </div>
      </div>
      {rightContent}
    </button>
  );
}
