export const leaseStateOptions = [
  { id: "TX", label: "Texas", basePerAcre: 16, demandBias: 8 },
  { id: "GA", label: "Georgia", basePerAcre: 15, demandBias: 6 },
  { id: "CO", label: "Colorado", basePerAcre: 12, demandBias: 5 },
  { id: "MT", label: "Montana", basePerAcre: 11, demandBias: 4 },
  { id: "US", label: "Other US state", basePerAcre: 13, demandBias: 0 },
] as const;

export const leaseTermOptions = [
  {
    id: "day",
    label: "Day access",
    unitLabel: "per day",
    multiplier: 0.08,
    minimum: 175,
  },
  {
    id: "weekend",
    label: "Weekend package",
    unitLabel: "per weekend",
    multiplier: 0.18,
    minimum: 450,
  },
  {
    id: "season",
    label: "Season lease",
    unitLabel: "per season",
    multiplier: 1,
    minimum: 950,
  },
  {
    id: "annual",
    label: "Annual access",
    unitLabel: "per year",
    multiplier: 1.18,
    minimum: 1200,
  },
] as const;

export const habitatOptions = [
  { id: "crop_timber", label: "Crop edge + timber", multiplier: 1.12 },
  { id: "ranch_mosaic", label: "Ranch mosaic", multiplier: 1.08 },
  { id: "mountain", label: "Mountain / foothill", multiplier: 1.1 },
  { id: "timber_creek", label: "Timber + creek bottom", multiplier: 1.08 },
  { id: "wetland", label: "Wetland / waterfowl", multiplier: 1.08 },
  { id: "pasture", label: "Pasture / open ground", multiplier: 0.9 },
] as const;

export const demandOptions = [
  { id: "remote", label: "Remote / local demand", multiplier: 0.88 },
  { id: "regional", label: "Regional drive market", multiplier: 1 },
  { id: "metro", label: "Near major metro", multiplier: 1.15 },
  { id: "destination", label: "Destination quality", multiplier: 1.22 },
] as const;

export const evidenceOptions = [
  { id: "unknown", label: "Limited proof", multiplier: 0.92, score: 2 },
  { id: "sign", label: "Tracks, rubs, roosts, sightings", multiplier: 1, score: 7 },
  { id: "trail_camera", label: "Trail cam or scouting photos", multiplier: 1.06, score: 13 },
  { id: "harvest_history", label: "Recent harvest history", multiplier: 1.12, score: 18 },
] as const;

export const accessOptions = [
  { id: "basic", label: "Basic access", multiplier: 0.94 },
  { id: "good", label: "Good roads and parking", multiplier: 1.02 },
  { id: "premium", label: "Gated, mapped, easy staging", multiplier: 1.08 },
] as const;

export const exclusivityOptions = [
  { id: "shared", label: "Shared access", multiplier: 0.82 },
  { id: "limited", label: "Limited party", multiplier: 1 },
  { id: "exclusive", label: "Exclusive lease", multiplier: 1.22 },
] as const;

export const pressureOptions = [
  { id: "open", label: "Frequent pressure", lift: -0.08 },
  { id: "standard", label: "Standard season use", lift: 0 },
  { id: "managed", label: "Managed low-pressure plan", lift: 0.05 },
] as const;

export const boundaryOptions = [
  { id: "rough", label: "Approximate only", score: 8 },
  { id: "drawn", label: "Boundary drawn", score: 18 },
  { id: "verified", label: "GIS or survey backed", score: 25 },
] as const;

export const photoOptions = [
  { id: "none", label: "No photos yet", score: 3 },
  { id: "basic", label: "Habitat photos", score: 10 },
  { id: "proof", label: "Habitat + wildlife proof", score: 17 },
] as const;

export const rulesOptions = [
  { id: "verbal", label: "Verbal rules", score: 4 },
  { id: "written", label: "Written rules", score: 12 },
  { id: "lease_ready", label: "Lease-ready terms", score: 18 },
] as const;

export const speciesOptions = [
  { id: "whitetail", label: "Whitetail deer", lift: 0.13 },
  { id: "mule_deer", label: "Mule deer", lift: 0.14 },
  { id: "elk", label: "Elk", lift: 0.22 },
  { id: "turkey", label: "Turkey", lift: 0.07 },
  { id: "waterfowl", label: "Waterfowl", lift: 0.1 },
  { id: "upland", label: "Upland birds", lift: 0.06 },
  { id: "hog_predator", label: "Hog / predator", lift: 0.04 },
] as const;

export const amenityOptions = [
  { id: "lodging", label: "Cabin or lodging", lift: 0.16 },
  { id: "stands_blinds", label: "Stands or blinds", lift: 0.05 },
  { id: "feeders_plots", label: "Feeders or food plots", lift: 0.05 },
  { id: "trail_network", label: "Road or trail network", lift: 0.04 },
  { id: "secure_parking", label: "Secure parking", lift: 0.03 },
  { id: "guide_checkin", label: "Guide or owner check-in", lift: 0.06 },
  { id: "insurance_ready", label: "Insurance-friendly terms", lift: 0.03 },
] as const;

export const constraintOptions = [
  { id: "livestock", label: "Livestock or crop sensitivity", drag: 0.06 },
  { id: "season_closures", label: "Seasonal closures", drag: 0.07 },
  { id: "neighbor_pressure", label: "Nearby hunting pressure", drag: 0.08 },
  { id: "limited_roads", label: "Limited vehicle access", drag: 0.06 },
  { id: "flood_fire", label: "Flood, fire, or weather risk", drag: 0.05 },
] as const;

export type LeaseStateCode = (typeof leaseStateOptions)[number]["id"];
export type LeaseTerm = (typeof leaseTermOptions)[number]["id"];
export type HabitatType = (typeof habitatOptions)[number]["id"];
export type DemandType = (typeof demandOptions)[number]["id"];
export type EvidenceType = (typeof evidenceOptions)[number]["id"];
export type AccessType = (typeof accessOptions)[number]["id"];
export type ExclusivityType = (typeof exclusivityOptions)[number]["id"];
export type PressureType = (typeof pressureOptions)[number]["id"];
export type BoundaryStatus = (typeof boundaryOptions)[number]["id"];
export type PhotoStatus = (typeof photoOptions)[number]["id"];
export type RulesStatus = (typeof rulesOptions)[number]["id"];
export type SpeciesId = (typeof speciesOptions)[number]["id"];
export type AmenityId = (typeof amenityOptions)[number]["id"];
export type ConstraintId = (typeof constraintOptions)[number]["id"];

export type LeasePricingInputs = {
  state: LeaseStateCode;
  acres: number;
  huntablePercent: number;
  habitat: HabitatType;
  demand: DemandType;
  evidence: EvidenceType;
  access: AccessType;
  exclusivity: ExclusivityType;
  pressure: PressureType;
  boundaryStatus: BoundaryStatus;
  photoStatus: PhotoStatus;
  rulesStatus: RulesStatus;
  leaseTerm: LeaseTerm;
  partySize: number;
  hasWater: boolean;
  species: SpeciesId[];
  amenities: AmenityId[];
  constraints: ConstraintId[];
};

export type LeasePricingResult = {
  stateLabel: string;
  termLabel: string;
  unitLabel: string;
  huntableAcres: number;
  low: number;
  target: number;
  high: number;
  perAcreLow: number;
  perAcreTarget: number;
  perAcreHigh: number;
  deposit: number;
  marketIndex: number;
  readinessScore: number;
  confidenceScore: number;
  confidenceLabel: string;
  selectedSpeciesLabels: string[];
  selectedAmenityLabels: string[];
  selectedConstraintLabels: string[];
  pricingSignals: string[];
  recommendations: string[];
};

export const defaultLeasePricingInputs: LeasePricingInputs = {
  state: "TX",
  acres: 240,
  huntablePercent: 82,
  habitat: "crop_timber",
  demand: "regional",
  evidence: "trail_camera",
  access: "good",
  exclusivity: "limited",
  pressure: "managed",
  boundaryStatus: "drawn",
  photoStatus: "proof",
  rulesStatus: "written",
  leaseTerm: "season",
  partySize: 3,
  hasWater: true,
  species: ["whitetail", "turkey"],
  amenities: ["stands_blinds", "feeders_plots", "trail_network"],
  constraints: [],
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function roundToNearest(value: number, step: number) {
  return Math.round(value / step) * step;
}

function getOption<T extends { id: string }>(options: readonly T[], id: string) {
  return options.find((option) => option.id === id) ?? options[0];
}

function acreageScale(acres: number) {
  if (acres < 60) return 1.32;
  if (acres < 160) return 1.15;
  if (acres < 500) return 1;
  if (acres < 1500) return 0.82;
  if (acres < 5000) return 0.66;
  if (acres < 10000) return 0.54;
  return 0.46;
}

function confidenceLabel(score: number) {
  if (score >= 82) return "Strong";
  if (score >= 68) return "Good";
  if (score >= 54) return "Directional";
  return "Early estimate";
}

export function formatUsd(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value);
}

export function calculateLeasePricing(
  inputs: LeasePricingInputs,
): LeasePricingResult {
  const state = getOption(leaseStateOptions, inputs.state);
  const term = getOption(leaseTermOptions, inputs.leaseTerm);
  const habitat = getOption(habitatOptions, inputs.habitat);
  const demand = getOption(demandOptions, inputs.demand);
  const evidence = getOption(evidenceOptions, inputs.evidence);
  const access = getOption(accessOptions, inputs.access);
  const exclusivity = getOption(exclusivityOptions, inputs.exclusivity);
  const pressure = getOption(pressureOptions, inputs.pressure);
  const boundary = getOption(boundaryOptions, inputs.boundaryStatus);
  const photos = getOption(photoOptions, inputs.photoStatus);
  const rules = getOption(rulesOptions, inputs.rulesStatus);

  const safeAcres = clamp(Number.isFinite(inputs.acres) ? inputs.acres : 0, 10, 20000);
  const huntablePercent = clamp(inputs.huntablePercent, 15, 100);
  const huntableAcres = Math.max(1, safeAcres * (huntablePercent / 100));
  const selectedSpecies = speciesOptions.filter((option) =>
    inputs.species.includes(option.id),
  );
  const selectedAmenities = amenityOptions.filter((option) =>
    inputs.amenities.includes(option.id),
  );
  const selectedConstraints = constraintOptions.filter((option) =>
    inputs.constraints.includes(option.id),
  );

  const speciesLift = Math.min(
    selectedSpecies.reduce((total, option) => total + option.lift, 0),
    0.58,
  );
  const amenityLift = Math.min(
    selectedAmenities.reduce((total, option) => total + option.lift, 0),
    0.3,
  );
  const constraintDrag = Math.min(
    selectedConstraints.reduce((total, option) => total + option.drag, 0),
    0.3,
  );
  const waterLift = inputs.hasWater ? 0.05 : 0;
  const partyLift = 1 + Math.min(Math.max(inputs.partySize - 2, 0) * 0.035, 0.14);
  const valueLift =
    1 + speciesLift + amenityLift + waterLift + pressure.lift - constraintDrag;

  const perAcreTarget = clamp(
    state.basePerAcre *
      acreageScale(safeAcres) *
      habitat.multiplier *
      demand.multiplier *
      evidence.multiplier *
      access.multiplier *
      exclusivity.multiplier *
      valueLift,
    4,
    95,
  );

  const seasonTarget = Math.max(
    perAcreTarget * huntableAcres * partyLift,
    term.minimum / Math.max(term.multiplier, 0.01),
  );
  const target = roundToNearest(seasonTarget * term.multiplier, 25);
  const low = roundToNearest(Math.max(target * 0.84, term.minimum), 25);
  const high = roundToNearest(Math.max(target * 1.2, term.minimum + 100), 25);
  const deposit = roundToNearest(Math.max(target * 0.18, 250), 25);

  const marketIndex = clamp(
    Math.round(
      45 +
        state.demandBias +
        speciesLift * 34 +
        (demand.multiplier - 1) * 62 +
        evidence.score * 0.75 +
        amenityLift * 22 -
        constraintDrag * 38,
    ),
    25,
    96,
  );
  const readinessScore = clamp(
    Math.round(
      28 +
        boundary.score +
        photos.score +
        rules.score +
        evidence.score * 0.7 +
        (selectedSpecies.length ? 8 : 0) +
        (inputs.amenities.includes("insurance_ready") ? 7 : 0),
    ),
    24,
    98,
  );
  const confidenceScore = clamp(
    Math.round(
      46 +
        evidence.score +
        boundary.score * 0.55 +
        photos.score * 0.35 +
        rules.score * 0.25 +
        Math.min(selectedSpecies.length * 4, 14) +
        (inputs.constraints.length ? -3 : 3),
    ),
    38,
    94,
  );

  const pricingSignals = [
    `${state.label} baseline: ${formatUsd(state.basePerAcre)} per huntable acre before property modifiers.`,
    `${habitat.label} habitat, ${demand.label.toLowerCase()}, and ${evidence.label.toLowerCase()} move the range.`,
    `${exclusivity.label} with ${inputs.partySize} hunter${inputs.partySize === 1 ? "" : "s"} supports the ${term.label.toLowerCase()} recommendation.`,
  ];

  const recommendations = buildRecommendations({
    readinessScore,
    marketIndex,
    inputs,
    selectedSpeciesCount: selectedSpecies.length,
    selectedAmenitiesCount: selectedAmenities.length,
    selectedConstraintsCount: selectedConstraints.length,
  });

  return {
    stateLabel: state.label,
    termLabel: term.label,
    unitLabel: term.unitLabel,
    huntableAcres,
    low,
    target,
    high,
    perAcreLow: low / huntableAcres,
    perAcreTarget: target / huntableAcres,
    perAcreHigh: high / huntableAcres,
    deposit,
    marketIndex,
    readinessScore,
    confidenceScore,
    confidenceLabel: confidenceLabel(confidenceScore),
    selectedSpeciesLabels: selectedSpecies.map((option) => option.label),
    selectedAmenityLabels: selectedAmenities.map((option) => option.label),
    selectedConstraintLabels: selectedConstraints.map((option) => option.label),
    pricingSignals,
    recommendations,
  };
}

function buildRecommendations({
  readinessScore,
  marketIndex,
  inputs,
  selectedSpeciesCount,
  selectedAmenitiesCount,
  selectedConstraintsCount,
}: {
  readinessScore: number;
  marketIndex: number;
  inputs: LeasePricingInputs;
  selectedSpeciesCount: number;
  selectedAmenitiesCount: number;
  selectedConstraintsCount: number;
}) {
  const items: string[] = [];

  if (readinessScore < 72) {
    items.push(
      "Raise listing readiness before pushing price: mapped boundaries, written rules, habitat photos, and wildlife proof make the estimate easier to defend.",
    );
  } else {
    items.push(
      "Lead with trust assets: boundary privacy, written rules, wildlife proof, and a request-first workflow can support the upper half of the range.",
    );
  }

  if (marketIndex >= 76) {
    items.push(
      "Demand looks strong. Test the target price first, keep a deposit requirement, and lower only if serious requests stall.",
    );
  } else {
    items.push(
      "Use the low-to-target range until the listing collects requests, then adjust after real hunter demand appears.",
    );
  }

  if (selectedSpeciesCount < 2) {
    items.push(
      "Add secondary species or off-season uses if they are legitimate. Multi-species access improves perceived value.",
    );
  }

  if (selectedAmenitiesCount < 3) {
    items.push(
      "Document practical amenities such as parking, stands, blinds, water, and check-in rules to reduce hunter uncertainty.",
    );
  }

  if (selectedConstraintsCount > 0) {
    items.push(
      "Convert constraints into clear rules. Hunters accept limits more easily when they are specific before a request is sent.",
    );
  }

  if (inputs.exclusivity !== "exclusive" && inputs.leaseTerm !== "day") {
    items.push(
      "Offer an exclusive premium tier if the property can handle it. Some hunters will pay more for low-pressure access.",
    );
  }

  return items.slice(0, 5);
}

export function buildLeasePricingReportLines({
  firstName,
  lastName,
  email,
  inputs,
  result,
}: {
  firstName: string;
  lastName: string;
  email: string;
  inputs: LeasePricingInputs;
  result: LeasePricingResult;
}) {
  const term = getOption(leaseTermOptions, inputs.leaseTerm);
  const habitat = getOption(habitatOptions, inputs.habitat);
  const demand = getOption(demandOptions, inputs.demand);
  const evidence = getOption(evidenceOptions, inputs.evidence);
  const access = getOption(accessOptions, inputs.access);
  const exclusivity = getOption(exclusivityOptions, inputs.exclusivity);
  const pressure = getOption(pressureOptions, inputs.pressure);
  const boundary = getOption(boundaryOptions, inputs.boundaryStatus);
  const photos = getOption(photoOptions, inputs.photoStatus);
  const rules = getOption(rulesOptions, inputs.rulesStatus);

  return [
    "# Huntfields.com Lease Pricing Report",
    `Prepared for: ${firstName} ${lastName}`,
    `Email: ${email}`,
    `Generated: ${new Date().toLocaleDateString("en-US")}`,
    "",
    "## Recommended price range",
    `${formatUsd(result.low)} - ${formatUsd(result.high)} ${result.unitLabel}`,
    `Target ask: ${formatUsd(result.target)} ${result.unitLabel}`,
    `Per huntable acre: ${formatUsd(result.perAcreLow)} - ${formatUsd(result.perAcreHigh)}`,
    `Suggested deposit: ${formatUsd(result.deposit)}`,
    "",
    "## Property snapshot",
    `State: ${result.stateLabel}`,
    `Total acres: ${formatCompactNumber(inputs.acres)}`,
    `Huntable acres: ${formatCompactNumber(result.huntableAcres)}`,
    `Lease product: ${term.label}`,
    `Habitat: ${habitat.label}`,
    `Demand position: ${demand.label}`,
    `Wildlife proof: ${evidence.label}`,
    `Access: ${access.label}`,
    `Exclusivity: ${exclusivity.label}`,
    `Pressure plan: ${pressure.label}`,
    `Water feature: ${inputs.hasWater ? "Yes" : "No"}`,
    `Party size: ${inputs.partySize}`,
    "",
    "## Wildlife and amenities",
    `Wildlife: ${result.selectedSpeciesLabels.join(", ") || "Not selected"}`,
    `Amenities: ${result.selectedAmenityLabels.join(", ") || "Not selected"}`,
    `Constraints: ${result.selectedConstraintLabels.join(", ") || "None selected"}`,
    "",
    "## Listing readiness",
    `Readiness score: ${result.readinessScore}/100`,
    `Market demand index: ${result.marketIndex}/100`,
    `Estimate confidence: ${result.confidenceLabel} (${result.confidenceScore}/100)`,
    `Boundary status: ${boundary.label}`,
    `Photo status: ${photos.label}`,
    `Rules status: ${rules.label}`,
    "",
    "## Pricing signals",
    ...result.pricingSignals.map((item) => `- ${item}`),
    "",
    "## Action plan",
    ...result.recommendations.map((item) => `- ${item}`),
    "",
    "## No warranty / planning note",
    "Huntfields.com provides this report as a planning estimate only. Huntfields.com does not guarantee and assumes no warranty for inaccurate, incomplete, outdated, or user-submitted information, including acreage, wildlife claims, habitat notes, availability, pricing inputs, legal compliance, third-party information, or actual market demand. This report is not an appraisal, legal advice, tax advice, insurance advice, or a binding offer. Final lease terms should be reviewed against local law, season dates, property condition, liability planning, landowner risk tolerance, and real hunter requests.",
  ];
}
