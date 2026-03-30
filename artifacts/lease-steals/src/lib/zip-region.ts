const ZIP_STATE: [number, number, string][] = [
  [10, 14, "NY"], [15, 19, "PA"], [19, 19, "DE"], [20, 21, "MD"],
  [22, 24, "VA"], [25, 26, "WV"], [27, 28, "NC"], [29, 29, "SC"],
  [30, 31, "GA"], [32, 34, "FL"], [35, 36, "AL"], [37, 38, "TN"],
  [39, 39, "MS"], [40, 42, "KY"], [43, 45, "OH"], [46, 47, "IN"],
  [48, 49, "MI"], [50, 52, "IA"], [53, 54, "WI"], [55, 56, "MN"],
  [57, 57, "SD"], [58, 58, "ND"], [59, 59, "MT"], [60, 62, "IL"],
  [63, 65, "MO"], [66, 67, "KS"], [68, 69, "NE"], [70, 72, "LA"],
  [73, 74, "OK"], [75, 79, "TX"], [80, 81, "CO"], [82, 83, "WY"],
  [83, 83, "ID"], [84, 84, "UT"], [85, 86, "AZ"], [87, 88, "NM"],
  [89, 89, "NV"], [90, 96, "CA"], [97, 97, "OR"], [98, 99, "WA"],
]

const STATE_REGIONS: Record<string, string[]> = {
  AZ: ["Arizona", "Southwest"],
  NV: ["Nevada", "Southwest"],
  NM: ["New Mexico", "Southwest"],
  UT: ["Utah", "Southwest"],
  CO: ["Colorado", "Southwest"],
  CA: ["California", "Southern California", "SoCal", "Northern California", "NorCal"],
  OR: ["Oregon", "Pacific Northwest", "Northwest"],
  WA: ["Washington", "Pacific Northwest", "Northwest"],
  TX: ["Texas", "South"],
  FL: ["Florida", "Southeast", "South"],
  GA: ["Georgia", "Southeast"],
  NC: ["North Carolina", "Southeast"],
  SC: ["South Carolina", "Southeast"],
  TN: ["Tennessee", "Southeast"],
  AL: ["Alabama", "Southeast"],
  MS: ["Mississippi", "Southeast"],
  NY: ["New York", "New York City", "NYC", "Northeast"],
  NJ: ["New Jersey", "Northeast"],
  CT: ["Connecticut", "New England", "Northeast"],
  MA: ["Massachusetts", "New England", "Northeast"],
  RI: ["Rhode Island", "New England", "Northeast"],
  VT: ["Vermont", "New England", "Northeast"],
  NH: ["New Hampshire", "New England", "Northeast"],
  ME: ["Maine", "New England", "Northeast"],
  IL: ["Illinois", "Midwest", "Chicago"],
  OH: ["Ohio", "Midwest"],
  MI: ["Michigan", "Midwest"],
  IN: ["Indiana", "Midwest"],
  MN: ["Minnesota", "Midwest"],
  MO: ["Missouri", "Midwest"],
  WI: ["Wisconsin", "Midwest"],
  KS: ["Kansas", "Midwest"],
  NE: ["Nebraska", "Midwest"],
  IA: ["Iowa", "Midwest"],
  ND: ["North Dakota", "Midwest"],
  SD: ["South Dakota", "Midwest"],
  VA: ["Virginia", "Mid-Atlantic", "Northeast"],
  MD: ["Maryland", "Mid-Atlantic", "Northeast"],
  PA: ["Pennsylvania", "Mid-Atlantic", "Northeast"],
  DE: ["Delaware", "Mid-Atlantic", "Northeast"],
  KY: ["Kentucky", "Southeast"],
  WV: ["West Virginia", "Southeast"],
  LA: ["Louisiana", "South"],
  OK: ["Oklahoma", "South"],
  AR: ["Arkansas", "South"],
  MT: ["Montana", "Northwest"],
  ID: ["Idaho", "Northwest"],
  WY: ["Wyoming", "Northwest"],
}

export function getStateFromZip(zip: string): string | null {
  if (zip.length < 2) return null
  const prefix = parseInt(zip.slice(0, 2))
  for (const [min, max, state] of ZIP_STATE) {
    if (prefix >= min && prefix <= max) return state
  }
  return null
}

export function isRegionVisibleForZip(region: string, zip: string): boolean {
  if (!region) return true
  const lower = region.toLowerCase().trim()
  if (lower === "national" || lower === "nationwide" || lower === "all") return true

  const state = getStateFromZip(zip)
  if (!state) return true

  const validRegions = STATE_REGIONS[state] ?? []
  return validRegions.some(
    (r) => lower.includes(r.toLowerCase()) || r.toLowerCase().includes(lower)
  )
}

export function getStateNameFromZip(zip: string): string | null {
  const state = getStateFromZip(zip)
  if (!state) return null
  const names: Record<string, string> = {
    AZ: "Arizona", CA: "California", TX: "Texas", FL: "Florida", NY: "New York",
    NJ: "New Jersey", IL: "Illinois", OH: "Ohio", MI: "Michigan", PA: "Pennsylvania",
    WA: "Washington", CO: "Colorado", NV: "Nevada", GA: "Georgia", NC: "North Carolina",
    VA: "Virginia", MA: "Massachusetts", MN: "Minnesota", OR: "Oregon", UT: "Utah",
    NM: "New Mexico", TN: "Tennessee", SC: "South Carolina", AL: "Alabama",
    MD: "Maryland", WI: "Wisconsin", MO: "Missouri", KY: "Kentucky", LA: "Louisiana",
    OK: "Oklahoma", KS: "Kansas", NE: "Nebraska", AR: "Arkansas", ID: "Idaho",
    MT: "Montana", WY: "Wyoming", ND: "North Dakota", SD: "South Dakota",
    WV: "West Virginia", IN: "Indiana", IA: "Iowa", DE: "Delaware",
    CT: "Connecticut", RI: "Rhode Island", VT: "Vermont", NH: "New Hampshire",
    ME: "Maine",
  }
  return names[state] ?? state
}
