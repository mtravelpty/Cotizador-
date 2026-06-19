import { useEffect, useMemo, useRef, useState } from "react";
import { compressImage } from "@/lib/image-utils";
import { PriceInput } from "@/components/ui/price-input";
import InlineRangePicker, { nightsBetween } from "./InlineRangePicker";
import {
  X,
  Check,
  ChevronDown,
  Plane,
  Hotel,
  Bus,
  MapPin,
  Ship,
  Tag,
  Sparkles,
  ImageIcon,
} from "lucide-react";
import type { Acomodacion, ServicioSeleccionado } from "@/lib/types";
import ServiceNameAutocomplete from "./ServiceNameAutocomplete";
import { useServiceNameSuggestions, type SuggestionCategory } from "@/lib/useServiceNameSuggestions";

type CustomTipo = "hotel" | "traslado" | "tour" | "vuelo" | "catamaran" | "otros";

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (s: ServicioSeleccionado) => void;
  globalFechaInicio?: string;
  globalFechaFin?: string;
  globalNinos?: number;
  initial?: ServicioSeleccionado | null;
}

const TIPO_OPTIONS: { value: CustomTipo; label: string }[] = [
  { value: "hotel", label: "Hotelería" },
  { value: "traslado", label: "Traslado" },
  { value: "tour", label: "Tours" },
  { value: "vuelo", label: "Vuelos" },
  { value: "catamaran", label: "Catamarán" },
  { value: "otros", label: "Otros" },
];

const MODALIDAD_OPTIONS: { value: "Regular" | "Privado"; label: string }[] = [
  { value: "Regular", label: "Regular" },
  { value: "Privado", label: "Privado" },
];

const ALL_ACOM: Acomodacion[] = ["SGL", "DBL", "TPL", "CHD"];

const CIUDADES_VUELO = ["Panamá", "Bocas del Toro"] as const;

const UBICACIONES = [
  "BOCAS DEL TORO",
  "CHIRIQUÍ",
  "CIUDAD DE PANAMÁ",
  "COCLÉ (RIVIERA PACÍFICA)",
  "COLÓN",
  "CONTADORA",
  "SAN BLAS",
  "TABOGA",
  "VERAGUAS / SANTIAGO",
];

const CATEGORIAS = [
  { value: "★★★", label: "★★★" },
  { value: "★★★★", label: "★★★★" },
  { value: "★★★★★", label: "★★★★★" },
];

const lbl =
  "block text-[11px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wide";
const inputCls =
  "w-full h-10 px-3.5 rounded-xl border border-slate-200 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary placeholder:text-slate-400";

const TIPO_ICON: Record<CustomTipo, React.ReactNode> = {
  hotel: <Hotel className="w-4 h-4" />,
  traslado: <Bus className="w-4 h-4" />,
  tour: <MapPin className="w-4 h-4" />,
  vuelo: <Plane className="w-4 h-4" />,
  catamaran: <Ship className="w-4 h-4" />,
  otros: <Tag className="w-4 h-4" />,
};

const TIPO_TITLE: Record<CustomTipo, string> = {
  hotel: "Hotelería personalizada",
  traslado: "Traslado personalizado",
  tour: "Tour personalizado",
  vuelo: "Vuelo personalizado",
  catamaran: "Catamarán personalizado",
  otros: "Ítem personalizado",
};

const TIPO_SUBTITLE: Record<CustomTipo, string> = {
  hotel: "Agrega un hotel que no está en el tarifario",
  traslado: "Agrega un traslado que no está en el tarifario",
  tour: "Agrega un tour que no está en el tarifario",
  vuelo: "Selecciona origen y destino del vuelo",
  catamaran: "Agrega un servicio de catamarán",
  otros: "Agrega un servicio que no está en el tarifario",
};

interface CustomSelectProps<T extends string> {
  value: T | "";
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  placeholder?: string;
}

function CustomSelect<T extends string>({
  value,
  onChange,
  options,
  placeholder = "Seleccionar",
}: CustomSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const selectedLabel = options.find((o) => o.value === value)?.label;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full h-10 px-3.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary flex items-center justify-between gap-2 transition-colors hover:border-slate-300"
        style={{ color: value ? "#0f172a" : "#94a3b8" }}
      >
        <span className="truncate">{selectedLabel ?? placeholder}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
              className="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 text-sm text-slate-800 hover:bg-primary/5 hover:text-primary transition-colors text-left"
            >
              <span>{o.label}</span>
              {value === o.value && (
                <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface PriceRowProps {
  label: string;
  labelNino?: string;
  precio: string;
  setPrecio: (v: string) => void;
  precioNino: string;
  setPrecioNino: (v: string) => void;
  ninosEnabled: boolean;
  showNino?: boolean;
  hintText?: string;
}

function PriceRow({
  label,
  labelNino = "Precio niño (USD)",
  precio,
  setPrecio,
  precioNino,
  setPrecioNino,
  ninosEnabled,
  showNino = true,
  hintText,
}: PriceRowProps) {
  return (
    <>
      <div className={showNino ? "grid grid-cols-2 gap-3" : ""}>
        <div>
          <label className={lbl}>{label}</label>
          <PriceInput
            value={precio}
            onChange={setPrecio}
            placeholder="0"
            wrapperClassName="w-full"
            inputClassName="w-full h-10 pr-3.5 rounded-xl border border-slate-200 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary placeholder:text-slate-400 tabular-nums"
          />
        </div>
        {showNino && (
          <div>
            <label
              className={`block text-[11px] font-semibold mb-1.5 uppercase tracking-wide transition-colors ${
                ninosEnabled ? "text-slate-500" : "text-slate-300"
              }`}
            >
              {labelNino}
            </label>
            <PriceInput
              value={precioNino}
              onChange={setPrecioNino}
              placeholder="0"
              disabled={!ninosEnabled}
              wrapperClassName="w-full"
              inputClassName={`w-full h-10 pr-3.5 rounded-xl border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary placeholder:text-slate-300 tabular-nums transition-all duration-200 ${
                ninosEnabled
                  ? "border-slate-200 text-slate-900"
                  : "border-slate-100 text-slate-300 bg-slate-50 cursor-not-allowed"
              }`}
            />
          </div>
        )}
      </div>
      {hintText && (
        <p className="text-[11px] text-slate-500 -mt-2">{hintText}</p>
      )}
    </>
  );
}

export default function CustomItemModal({
  open,
  onClose,
  onSave,
  globalFechaInicio,
  globalFechaFin,
  globalNinos = 0,
  initial,
}: Props) {
  const isEdit = !!initial;

  const [tipo, setTipo] = useState<CustomTipo>("tour");
  const [nombre, setNombre] = useState("");
  const [precio, setPrecio] = useState<string>("");
  const [precioNino, setPrecioNino] = useState<string>("");
  const [notas, setNotas] = useState("");
  const [notesImportant, setNotesImportant] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [origen, setOrigen] = useState<string>(CIUDADES_VUELO[0]);
  const [destino, setDestino] = useState<string>(CIUDADES_VUELO[1]);
  const [idaVuelta, setIdaVuelta] = useState<boolean>(true);

  const [ubicacion, setUbicacion] = useState("");
  const [estrellas, setEstrellas] = useState("");
  const [tipoHabitacion, setTipoHabitacion] = useState("");
  const [desayuno, setDesayuno] = useState("");

  const [ruta, setRuta] = useState("");
  const [modalidad, setModalidad] = useState<"Regular" | "Privado">("Regular");
  const [horarioCustom, setHorarioCustom] = useState("");
  const [duracion, setDuracion] = useState("");
  const [entradasDesc, setEntradasDesc] = useState("");
  const [fechaInicioCat, setFechaInicioCat] = useState("");
  const [fechaFinCat, setFechaFinCat] = useState("");

  const nombreRef = useRef<HTMLInputElement>(null);
  const ninosEnabled = globalNinos > 0;

  useEffect(() => {
    if (open) {
      if (initial) {
        const rawTipo = initial.customTipo as CustomTipo | undefined;
        const initTipo: CustomTipo =
          rawTipo ??
          (initial.tipo === "vuelo"
            ? "vuelo"
            : initial.tipo === "hotel"
              ? "hotel"
              : initial.tipo === "tour"
                ? "tour"
                : initial.tipo === "catamaran"
                  ? "catamaran"
                  : "traslado");
        setTipo(initTipo);
        setNombre(initial.nombre.replace(/^\[Vuelo\]\s*/, ""));
        const initPrecio =
          typeof initial.unitOverride === "number"
            ? initial.unitOverride
            : initial.precios.p1 ??
              initial.precios.p2_5 ??
              initial.precios.p6_10 ??
              initial.precios.SGL ??
              initial.precios.DBL ??
              0;
        setPrecio(initPrecio ? String(initPrecio) : "");
        const initChd = initial.precios.chd;
        setPrecioNino(
          typeof initChd === "number" && initChd !== initPrecio && initChd > 0
            ? String(initChd)
            : "",
        );
        setNotas(initial.notas ?? "");
        setNotesImportant(initial.notesImportant ?? false);
        setImages(initial.images ?? []);
        setOrigen(initial.origen ?? CIUDADES_VUELO[0]);
        setDestino(initial.destino ?? CIUDADES_VUELO[1]);
        const arrowCount = (initial.nombre.match(/→/g) ?? []).length;
        setIdaVuelta(initial.tipo === "vuelo" ? arrowCount >= 2 : true);
        setUbicacion(initial.ubicacion ?? "");
        setEstrellas(initial.estrellas ?? "");
        setTipoHabitacion(initial.tipoHabitacion ?? "");
        setDesayuno(initial.desayuno ?? "");
        setRuta(initial.ruta ?? "");
        setModalidad((initial.tipoServicio as "Regular" | "Privado") ?? "Regular");
        setHorarioCustom(initial.horario ?? "");
        setDuracion(initial.duracion ?? "");
        setEntradasDesc(initial.entradasDesc ?? "");
        setFechaInicioCat(initial.fechaInicio ?? "");
        setFechaFinCat(initial.fechaFin ?? "");
      } else {
        setTipo("tour");
        setNombre("");
        setPrecio("");
        setPrecioNino("");
        setNotas("");
        setNotesImportant(false);
        setImages([]);
        setOrigen(CIUDADES_VUELO[0]);
        setDestino(CIUDADES_VUELO[1]);
        setIdaVuelta(true);
        setUbicacion("");
        setEstrellas("");
        setTipoHabitacion("");
        setDesayuno("");
        setRuta("");
        setModalidad("Regular");
        setHorarioCustom("");
        setDuracion("");
        setEntradasDesc("");
        setFechaInicioCat("");
        setFechaFinCat("");
      }
      window.setTimeout(() => nombreRef.current?.focus(), 50);
    }
  }, [open, initial]);

  useEffect(() => {
    if (!open || isEdit || tipo !== "hotel") return;
    setUbicacion((v) => v || "CIUDAD DE PANAMÁ");
    setEstrellas((v) => v || "★★★");
    setTipoHabitacion((v) => v || "Standard");
    setDesayuno((v) => v || "Desayuno incluido");
  }, [tipo, open, isEdit]);

  useEffect(() => {
    if (!ninosEnabled && precioNino !== "") {
      setPrecioNino("");
    }
  }, [ninosEnabled, precioNino]);

  const isVuelo = tipo === "vuelo";
  const isHotel = tipo === "hotel";
  const isTraslado = tipo === "traslado";
  const isTour = tipo === "tour";
  const isCatamaran = tipo === "catamaran";
  const isOtros = tipo === "otros";

  const { addSuggestion } = useServiceNameSuggestions();
  const CUSTOM_CATEGORY: Record<CustomTipo, SuggestionCategory> = {
    hotel: "hoteleria",
    traslado: "traslados",
    tour: "tours",
    vuelo: "aereos",
    catamaran: "catamaran",
    otros: "otros",
  };
  const suggestCategory = CUSTOM_CATEGORY[tipo];

  const vueloNombre = useMemo(
    () =>
      idaVuelta
        ? `${origen} → ${destino} → ${origen}`
        : `${origen} → ${destino}`,
    [origen, destino, idaVuelta],
  );

  if (!open) return null;

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();

    let displayName: string;
    if (isVuelo) {
      if (!origen || !destino) return;
      displayName = vueloNombre;
    } else {
      const trimmed = nombre.trim();
      if (!trimmed) {
        nombreRef.current?.focus();
        return;
      }
      displayName = trimmed;
    }

    const value = Number(precio) || 0;
    const ninoRaw = precioNino.trim();
    const chdValue = ninosEnabled && ninoRaw !== "" ? Number(ninoRaw) || 0 : value;
    const baseId = initial?.id ?? `MAN-${Date.now()}`;

    const internalTipo: ServicioSeleccionado["tipo"] =
      tipo === "hotel"
        ? "hotel"
        : tipo === "tour"
          ? "tour"
          : tipo === "vuelo"
            ? "vuelo"
            : tipo === "catamaran"
              ? "catamaran"
              : tipo === "otros"
                ? "tour"
                : "traslado";

    const precios: ServicioSeleccionado["precios"] =
      tipo === "hotel"
        ? Object.fromEntries(ALL_ACOM.map((a) => [a, value]))
        : { p1: value, p2_5: value, p6_10: value, chd: chdValue };

    const servicio: ServicioSeleccionado = {
      id: baseId,
      codigo: baseId,
      tipo: internalTipo,
      nombre: displayName,
      precios,
      manual: true,
      customTipo: tipo,
      notas: notas.trim() || undefined,
      notesImportant: notesImportant && !!notas.trim() ? true : undefined,
      images: images.length > 0 ? images : undefined,
      ...(isHotel
        ? {
            fechaInicio: globalFechaInicio || undefined,
            fechaFin: globalFechaFin || undefined,
            ubicacion: ubicacion || undefined,
            estrellas: estrellas || undefined,
            tipoHabitacion: tipoHabitacion || undefined,
            desayuno: desayuno || undefined,
          }
        : {}),
      ...(isVuelo
        ? {
            origen,
            destino,
            unitOverride: value,
          }
        : {}),
      ...(isTraslado
        ? {
            ruta: ruta.trim() || undefined,
            tipoServicio: modalidad,
          }
        : {}),
      ...(isTour
        ? {
            tipoServicio: modalidad,
            horario: horarioCustom.trim() || undefined,
            duracion: duracion.trim() || undefined,
            entradasDesc: entradasDesc.trim() || undefined,
          }
        : {}),
      ...(isCatamaran
        ? {
            tipoServicio: modalidad,
            horario: horarioCustom.trim() || undefined,
            fechaInicio: fechaInicioCat || undefined,
            fechaFin: fechaFinCat || undefined,
          }
        : {}),
    };

    if (!isVuelo) {
      addSuggestion(suggestCategory, displayName);
    }
    onSave(servicio);
    onClose();
  };

  const ciudadOptions = CIUDADES_VUELO.map((c) => ({ value: c, label: c }));
  const ubicacionOptions = UBICACIONES.map((u) => ({ value: u, label: u }));

  const editTitle = isEdit
    ? `Editar ${TIPO_OPTIONS.find((o) => o.value === tipo)?.label.toLowerCase() ?? "ítem"}`
    : TIPO_TITLE[tipo];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <form
        onSubmit={submit}
        className="w-full max-w-md bg-white rounded-2xl shadow-xl ring-1 ring-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#802d62]/10 text-[#802d62] flex items-center justify-center">
              {TIPO_ICON[tipo]}
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900 leading-tight">
                {isEdit
                  ? editTitle
                  : TIPO_TITLE[tipo]}
              </h2>
              <p className="text-[11px] text-slate-500">
                {TIPO_SUBTITLE[tipo]}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="submit"
              title={isEdit ? "Guardar" : "Agregar"}
              className="w-9 h-9 rounded-xl bg-[#802d62] hover:bg-[#6b2252] text-white flex items-center justify-center shadow-sm transition-colors"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl border border-[#D8E0EE] bg-white text-[#64748B] hover:bg-[#F5F7FA] flex items-center justify-center transition-colors"
              aria-label="Cerrar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Tipo de servicio */}
          <div>
            <label className={lbl}>Tipo de servicio</label>
            <CustomSelect
              value={tipo}
              onChange={(v) => setTipo(v as CustomTipo)}
              options={TIPO_OPTIONS}
              placeholder="Seleccionar tipo"
            />
          </div>

          {/* ── VUELO ── */}
          {isVuelo && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Origen</label>
                  <CustomSelect
                    value={origen}
                    onChange={setOrigen}
                    options={ciudadOptions}
                    placeholder="Seleccionar"
                  />
                </div>
                <div>
                  <label className={lbl}>Destino</label>
                  <CustomSelect
                    value={destino}
                    onChange={setDestino}
                    options={ciudadOptions}
                    placeholder="Seleccionar"
                  />
                </div>
              </div>

              <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2.5 cursor-pointer hover:bg-slate-50">
                <span className="text-sm font-medium text-slate-700">
                  Ida y vuelta
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={idaVuelta}
                  onClick={() => setIdaVuelta((v) => !v)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    idaVuelta ? "bg-primary" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                      idaVuelta ? "translate-x-4" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </label>

              <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2.5 flex items-center gap-2">
                <Plane className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                <div className="text-xs text-slate-600">
                  Nombre generado:{" "}
                  <span className="font-semibold text-slate-900">
                    {vueloNombre}
                  </span>
                </div>
              </div>

              <PriceRow
                label="Precio por persona (USD)"
                precio={precio}
                setPrecio={setPrecio}
                precioNino={precioNino}
                setPrecioNino={setPrecioNino}
                ninosEnabled={ninosEnabled}
                showNino={true}
                hintText={
                  ninosEnabled
                    ? "Si dejas el precio de niño vacío, se usará el precio de adulto"
                    : "Precio por persona del vuelo (puedes editarlo más tarde)"
                }
              />
            </>
          )}

          {/* ── HOTEL ── */}
          {isHotel && (
            <>
              <div>
                <label className={lbl}>Nombre del hotel</label>
                <ServiceNameAutocomplete
                  inputRef={nombreRef}
                  value={nombre}
                  onChange={setNombre}
                  category="hoteleria"
                  placeholder="Ej: Hotel Hilton Garden Inn"
                  className={inputCls}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Ubicación</label>
                  <CustomSelect
                    value={ubicacion}
                    onChange={setUbicacion}
                    options={ubicacionOptions}
                    placeholder="— Seleccionar —"
                  />
                </div>
                <div>
                  <label className={lbl}>Categoría</label>
                  <CustomSelect
                    value={estrellas}
                    onChange={setEstrellas}
                    options={CATEGORIAS}
                    placeholder="— Seleccionar —"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Tipo de habitación</label>
                  <input
                    list="cim-tipos-hab"
                    value={tipoHabitacion}
                    onChange={(e) => setTipoHabitacion(e.target.value)}
                    placeholder="Standard, Deluxe, Suite..."
                    className={inputCls}
                  />
                  <datalist id="cim-tipos-hab">
                    <option value="Standard" />
                    <option value="Deluxe" />
                    <option value="Suite" />
                    <option value="Junior Suite" />
                    <option value="Vista Jardín" />
                    <option value="Vista Mar" />
                  </datalist>
                </div>
                <div>
                  <label className={lbl}>Precio por noche (USD)</label>
                  <PriceInput
                    value={precio}
                    onChange={setPrecio}
                    placeholder="0"
                    wrapperClassName="w-full"
                    inputClassName="w-full h-10 pr-3.5 rounded-xl border border-slate-200 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary placeholder:text-slate-400 tabular-nums"
                  />
                </div>
              </div>
              <p className="text-[11px] text-slate-500 -mt-2">
                Se aplicará el mismo valor a todas las acomodaciones
              </p>

              <div>
                <label className={lbl}>Régimen / Desayuno</label>
                <input
                  list="cim-regimenes"
                  value={desayuno}
                  onChange={(e) => setDesayuno(e.target.value)}
                  placeholder="Ej: Desayuno buffet incluido"
                  className={inputCls}
                />
                <datalist id="cim-regimenes">
                  <option value="Solo alojamiento" />
                  <option value="Desayuno continental incluido" />
                  <option value="Desayuno buffet incluido" />
                  <option value="Alimentación completa incluida" />
                  <option value="Todo incluido" />
                </datalist>
              </div>
            </>
          )}

          {/* ── TRASLADO ── */}
          {isTraslado && (
            <>
              <div>
                <label className={lbl}>Nombre / descripción</label>
                <ServiceNameAutocomplete
                  inputRef={nombreRef}
                  value={nombre}
                  onChange={setNombre}
                  category="traslados"
                  placeholder="Ej: Traslado aeropuerto - hotel"
                  className={inputCls}
                />
              </div>

              <div>
                <label className={lbl}>Ruta / trayecto</label>
                <input
                  type="text"
                  value={ruta}
                  onChange={(e) => setRuta(e.target.value)}
                  placeholder="Ej: Tocumen → Ciudad de Panamá"
                  className={inputCls}
                />
              </div>

              <div>
                <label className={lbl}>Modalidad</label>
                <CustomSelect
                  value={modalidad}
                  onChange={setModalidad}
                  options={MODALIDAD_OPTIONS}
                />
              </div>

              <PriceRow
                label="Tarifa p/p (USD)"
                precio={precio}
                setPrecio={setPrecio}
                precioNino={precioNino}
                setPrecioNino={setPrecioNino}
                ninosEnabled={ninosEnabled}
                showNino={true}
                hintText={
                  ninosEnabled
                    ? "Si dejas el precio de niño vacío, se usará el precio de adulto"
                    : "Precio por persona"
                }
              />
            </>
          )}

          {/* ── TOUR ── */}
          {isTour && (
            <>
              <div>
                <label className={lbl}>Nombre del tour</label>
                <ServiceNameAutocomplete
                  inputRef={nombreRef}
                  value={nombre}
                  onChange={setNombre}
                  category="tours"
                  placeholder="Ej: Tour en lancha por San Blas"
                  className={inputCls}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Modalidad</label>
                  <CustomSelect
                    value={modalidad}
                    onChange={setModalidad}
                    options={MODALIDAD_OPTIONS}
                  />
                </div>
                <div>
                  <label className={lbl}>Horario</label>
                  <input
                    type="text"
                    value={horarioCustom}
                    onChange={(e) => setHorarioCustom(e.target.value)}
                    placeholder="Ej: 8:00 AM"
                    className={inputCls}
                  />
                </div>
              </div>

              <div>
                <label className={lbl}>Duración</label>
                <input
                  type="text"
                  value={duracion}
                  onChange={(e) => setDuracion(e.target.value)}
                  placeholder="Ej: 8 horas"
                  className={inputCls}
                />
              </div>

              <PriceRow
                label="Tarifa p/p (USD)"
                precio={precio}
                setPrecio={setPrecio}
                precioNino={precioNino}
                setPrecioNino={setPrecioNino}
                ninosEnabled={ninosEnabled}
                showNino={true}
                hintText={
                  ninosEnabled
                    ? "Si dejas el precio de niño vacío, se usará el precio de adulto"
                    : "Precio por persona"
                }
              />

              <div>
                <label className={lbl}>Entradas adicionales (si aplica)</label>
                <input
                  type="text"
                  value={entradasDesc}
                  onChange={(e) => setEntradasDesc(e.target.value)}
                  placeholder="Ej: Entrada al parque nacional incluida"
                  className={inputCls}
                />
              </div>
            </>
          )}

          {/* ── CATAMARÁN ── */}
          {isCatamaran && (
            <>
              <div>
                <label className={lbl}>Nombre del servicio</label>
                <ServiceNameAutocomplete
                  inputRef={nombreRef}
                  value={nombre}
                  onChange={setNombre}
                  category="catamaran"
                  placeholder="Ej: Catamarán a Taboga"
                  className={inputCls}
                />
              </div>

              {/* Estadía — check-in / check-out */}
              <div>
                <label className={lbl}>Estadía</label>
                <div className="rounded-xl border border-slate-200 p-3 bg-slate-50/50">
                  <InlineRangePicker
                    fechaInicio={fechaInicioCat}
                    fechaFin={fechaFinCat}
                    onSelect={(inicio, fin) => {
                      setFechaInicioCat(inicio);
                      setFechaFinCat(fin);
                    }}
                  />
                  {fechaInicioCat && fechaFinCat && fechaFinCat > fechaInicioCat && (
                    <p className="text-[11px] text-primary font-semibold mt-2 text-center">
                      {nightsBetween(fechaInicioCat, fechaFinCat)} noche{nightsBetween(fechaInicioCat, fechaFinCat) !== 1 ? "s" : ""}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Modalidad</label>
                  <CustomSelect
                    value={modalidad}
                    onChange={setModalidad}
                    options={MODALIDAD_OPTIONS}
                  />
                </div>
                <div>
                  <label className={lbl}>Horario</label>
                  <input
                    type="text"
                    value={horarioCustom}
                    onChange={(e) => setHorarioCustom(e.target.value)}
                    placeholder="Ej: 7:30 AM"
                    className={inputCls}
                  />
                </div>
              </div>

              <PriceRow
                label="Tarifa por noche / p/p (USD)"
                precio={precio}
                setPrecio={setPrecio}
                precioNino={precioNino}
                setPrecioNino={setPrecioNino}
                ninosEnabled={ninosEnabled}
                showNino={true}
                hintText={
                  ninosEnabled
                    ? "Si dejas el precio de niño vacío, se usará el precio de adulto"
                    : fechaInicioCat && fechaFinCat && fechaFinCat > fechaInicioCat
                      ? `Total = tarifa × ${nightsBetween(fechaInicioCat, fechaFinCat)} noches × pasajeros`
                      : "Tarifa por noche por persona"
                }
              />
            </>
          )}

          {/* ── OTROS ── */}
          {isOtros && (
            <>
              <div>
                <label className={lbl}>Nombre del servicio</label>
                <ServiceNameAutocomplete
                  inputRef={nombreRef}
                  value={nombre}
                  onChange={setNombre}
                  category="otros"
                  placeholder="Ej: Cena especial en restaurante"
                  className={inputCls}
                />
              </div>

              <PriceRow
                label="Tarifa (USD)"
                precio={precio}
                setPrecio={setPrecio}
                precioNino={precioNino}
                setPrecioNino={setPrecioNino}
                ninosEnabled={ninosEnabled}
                showNino={false}
                hintText="Tarifa fija para este servicio"
              />
            </>
          )}

          {/* Observaciones — always visible */}
          <div>
            <label className={lbl}>Observaciones</label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={2}
              placeholder="Detalles adicionales que aparecerán en la cotización"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary placeholder:text-slate-400 resize-none"
            />
            {notas.trim() && (
              <label className="flex items-center gap-2 mt-2 cursor-pointer select-none">
                <div
                  className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${notesImportant ? "bg-[#ef7b15]" : "bg-slate-200"}`}
                  onClick={() => setNotesImportant((v) => !v)}
                >
                  <div
                    className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${notesImportant ? "translate-x-4" : "translate-x-0.5"}`}
                  />
                </div>
                <span
                  className={`text-[11px] font-medium transition-colors ${notesImportant ? "text-[#ef7b15]" : "text-slate-500"}`}
                >
                  Marcar como importante
                </span>
              </label>
            )}
          </div>

          {/* Imágenes — always visible */}
          <div>
            <label className={lbl} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <ImageIcon size={12} /> Imágenes del servicio
            </label>
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
              <div className="flex flex-wrap gap-2 mb-2">
                {images.map((src, idx) => (
                  <div key={idx} className="relative group w-16 h-16 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 flex-shrink-0">
                    <img src={src} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setImages((prev) => prev.filter((_, i) => i !== idx))}
                      className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                      title="Eliminar imagen"
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-slate-300 text-sm text-slate-500 hover:border-primary hover:text-primary hover:bg-primary/5 transition-colors w-full justify-center"
            >
              <ImageIcon className="w-4 h-4" />
              {images.length > 0 ? "Agregar más imágenes" : "Subir imágenes"}
            </button>
            <p className="text-[11px] text-slate-400 mt-1">Máx. 3 visibles en PDF y correo</p>
          </div>
        </div>
      </form>
    </div>
  );
}
