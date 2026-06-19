export type SuggestionCategory =
  | "hoteleria"
  | "traslados"
  | "tours"
  | "aereos"
  | "catamaran"
  | "otros";

type SuggestionsStore = Record<SuggestionCategory, string[]>;

const STORAGE_KEY = "mastravel_service_name_suggestions";
const MAX_PER_CATEGORY = 100;

function emptyStore(): SuggestionsStore {
  return { hoteleria: [], traslados: [], tours: [], aereos: [], catamaran: [], otros: [] };
}

function loadStore(): SuggestionsStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw) as Partial<SuggestionsStore>;
    const store = emptyStore();
    for (const k of Object.keys(store) as SuggestionCategory[]) {
      if (Array.isArray(parsed[k])) store[k] = parsed[k] as string[];
    }
    return store;
  } catch {
    return emptyStore();
  }
}

function saveStore(store: SuggestionsStore): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // localStorage unavailable — silent fail
  }
}

/** Map from ServicioSeleccionado.tipo + optional customTipo → SuggestionCategory */
export function tipoToSuggestionCategory(
  tipo: string,
  customTipo?: string,
): SuggestionCategory {
  if (tipo === "hotel") return "hoteleria";
  if (tipo === "traslado") return "traslados";
  if (tipo === "vuelo") return "aereos";
  if (tipo === "catamaran") return "catamaran";
  if (tipo === "tour") {
    if (customTipo === "otros") return "otros";
    return "tours";
  }
  return "otros";
}

export function useServiceNameSuggestions() {
  function getSuggestions(category: SuggestionCategory, query: string): string[] {
    if (query.length < 2) return [];
    const store = loadStore();
    const q = query.toLowerCase();
    return store[category].filter((s) => s.toLowerCase().includes(q));
  }

  function addSuggestion(category: SuggestionCategory, name: string): void {
    const normalized = name.trim();
    if (!normalized) return;
    const store = loadStore();
    const list = store[category].filter((s) => s !== normalized);
    list.unshift(normalized);
    if (list.length > MAX_PER_CATEGORY) list.splice(MAX_PER_CATEGORY);
    store[category] = list;
    saveStore(store);
  }

  return { getSuggestions, addSuggestion };
}
