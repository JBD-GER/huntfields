import { createSupabasePublicClient } from "@/lib/supabase/server";

export type UsStateHuntingRule = {
  state_code: string;
  state_name: string;
  agency_name: string;
  agency_url: string;
  license_summary: string;
  hunter_education_summary: string;
  private_land_permission_summary: string;
  lease_license_summary: string | null;
  hunter_orange_summary: string | null;
  landowner_listing_requirements: string[];
  hunter_attestations: string[];
  booking_checklist: string[];
  contract_clauses: string[];
  source_urls: string[];
  reviewed_at: string;
};

export const fallbackUsStateRules: UsStateHuntingRule[] = [
  {
    state_code: "TX",
    state_name: "Texas",
    agency_name: "Texas Parks & Wildlife Department",
    agency_url: "https://tpwd.texas.gov/",
    license_summary:
      "Hunters must carry the appropriate Texas hunting license, endorsements, permits, and species tags.",
    hunter_education_summary:
      "Texas hunter education generally applies to hunters born on or after September 2, 1971.",
    private_land_permission_summary:
      "Private land hunting requires landowner permission and compliance with current TPWD rules.",
    lease_license_summary:
      "Texas paid hunting leases may require a TPWD Hunting Lease License for the landowner.",
    hunter_orange_summary:
      "Hunter orange depends on land type, species, and season; current TPWD rules control.",
    landowner_listing_requirements: [
      "Confirm authority to lease hunting access",
      "Confirm if a Texas Hunting Lease License is required",
      "Enter lease license number before booking if required",
      "Define species, dates, rules, access routes, and emergency contact",
    ],
    hunter_attestations: [
      "I will hold required Texas license, endorsements, permits, and tags before hunting.",
      "I understand Texas hunter education or legal deferral rules may apply to me.",
      "I will verify current TPWD season, bag, county, and method rules before hunting.",
    ],
    booking_checklist: [
      "Verify hunter license and tags",
      "Verify hunter education or legal exemption/deferral",
      "Confirm Texas Hunting Lease License if required",
      "Sign lease agreement electronically",
    ],
    contract_clauses: [
      "Hunter is responsible for all licenses, tags, education, and legal method of take.",
      "Landowner confirms authority to grant access and any required Texas hunting lease license.",
    ],
    source_urls: [
      "https://tpwd.texas.gov/business/licenses/public/commercial/hunting/",
      "https://tpwd.texas.gov/education/hunter-education",
      "https://tpwd.texas.gov/regulations/outdoor-annual/licenses/hunting-licenses-and-permits",
    ],
    reviewed_at: "2026-06-18T00:00:00.000Z",
  },
  {
    state_code: "CO",
    state_name: "Colorado",
    agency_name: "Colorado Parks and Wildlife",
    agency_url: "https://cpw.state.co.us/",
    license_summary:
      "Hunters must hold required Colorado licenses, habitat stamp where applicable, and species/unit authorization.",
    hunter_education_summary:
      "Colorado requires hunter education for anyone born on or after January 1, 1949 before applying for or buying a license.",
    private_land_permission_summary:
      "Private land access requires landowner permission before entry.",
    lease_license_summary:
      "No statewide marketplace lease-license requirement was identified in CPW public guidance.",
    hunter_orange_summary:
      "Blaze orange or pink requirements vary by species and season; current CPW rules control.",
    landowner_listing_requirements: [
      "Confirm private land access authority",
      "Provide GMU/unit context when relevant",
      "Define allowed species, methods, dates, and access routes",
    ],
    hunter_attestations: [
      "I will hold required Colorado licenses, habitat stamp, and draw/unit authorizations before hunting.",
      "I understand Colorado hunter education applies if I was born on or after January 1, 1949.",
    ],
    booking_checklist: [
      "Verify license/draw/unit authorization",
      "Verify hunter education where required",
      "Confirm GMU/unit and season dates",
      "Sign lease agreement electronically",
    ],
    contract_clauses: [
      "Hunter is responsible for CPW licenses, habitat stamp, draw/unit compliance, and education.",
      "Access is limited to approved dates, species, party size, and mapped areas.",
    ],
    source_urls: [
      "https://cpw.state.co.us/activities/hunting",
      "https://cpw.state.co.us/activities/hunting/big-game",
    ],
    reviewed_at: "2026-06-18T00:00:00.000Z",
  },
  {
    state_code: "MT",
    state_name: "Montana",
    agency_name: "Montana Fish, Wildlife & Parks",
    agency_url: "https://fwp.mt.gov/",
    license_summary:
      "Hunters must hold required Montana licenses, tags, permits, and hunting district authorizations.",
    hunter_education_summary:
      "Montana hunter education and apprentice/mentor rules vary by age and license path.",
    private_land_permission_summary:
      "Montana FWP states hunters must obtain landowner permission to hunt on all private land.",
    lease_license_summary:
      "No statewide marketplace lease-license requirement was identified in FWP public guidance.",
    hunter_orange_summary:
      "Hunter orange requirements depend on season/species; current Montana regulations control.",
    landowner_listing_requirements: [
      "Confirm private land permission terms",
      "Provide hunting district context when relevant",
      "Define gates, roads, parking, livestock, and closed areas",
    ],
    hunter_attestations: [
      "I will hold required Montana license, tags, permits, and district authorizations before hunting.",
      "I understand landowner permission is required for all Montana private land hunting.",
    ],
    booking_checklist: [
      "Verify license/tags/district authorization",
      "Confirm landowner permission",
      "Confirm access routes and closed areas",
      "Sign lease agreement electronically",
    ],
    contract_clauses: [
      "Hunter is responsible for FWP license, tag, permit, district, and season compliance.",
      "Landowner permission is limited to the signed agreement and mapped access area.",
    ],
    source_urls: [
      "https://fwp.mt.gov/hunt/access/private-lands",
      "https://fwp.mt.gov/hunt/regulations",
    ],
    reviewed_at: "2026-06-18T00:00:00.000Z",
  },
  {
    state_code: "GA",
    state_name: "Georgia",
    agency_name: "Georgia Wildlife Resources Division",
    agency_url: "https://georgiawildlife.com/",
    license_summary:
      "Hunters must hold required Georgia licenses, permits, and tags unless a legal exemption applies.",
    hunter_education_summary:
      "Georgia hunter education applies to residents and non-residents born on or after January 1, 1961 before purchasing a season license, with exceptions.",
    private_land_permission_summary:
      "Georgia private land access may be permission-based, formal lease, or hunting club based.",
    lease_license_summary:
      "No statewide marketplace lease-license requirement was identified in Georgia WRD public guidance.",
    hunter_orange_summary:
      "Hunter orange requirements vary by species and season; current Georgia regulations control.",
    landowner_listing_requirements: [
      "Confirm access authority",
      "Define club/lease style terms if applicable",
      "Provide species, guest policy, and harvest reporting expectations",
    ],
    hunter_attestations: [
      "I will hold required Georgia licenses and permits before hunting.",
      "I understand Georgia hunter education may apply if I was born on or after January 1, 1961.",
    ],
    booking_checklist: [
      "Verify license/permit status",
      "Verify hunter education or exception",
      "Confirm private land lease terms",
      "Sign lease agreement electronically",
    ],
    contract_clauses: [
      "Hunter is responsible for Georgia license, permit, season, harvest reporting, and education compliance.",
      "Private land access is granted only under signed terms.",
    ],
    source_urls: [
      "https://georgiawildlife.com/hunting/huntereducation",
      "https://georgiawildlife.com/hunting-permissions",
      "https://georgiawildlife.com/licenses-permits-passes/choose",
    ],
    reviewed_at: "2026-06-18T00:00:00.000Z",
  },
];

export async function getUsStateRules() {
  const supabase = createSupabasePublicClient();

  if (!supabase) {
    return fallbackUsStateRules;
  }

  const { data, error } = await supabase
    .from("us_state_hunting_rules")
    .select("*")
    .eq("active", true)
    .order("state_name");

  if (error || !data?.length) {
    return fallbackUsStateRules;
  }

  return data as UsStateHuntingRule[];
}

export async function getUsStateRule(stateCode: string | null | undefined) {
  const normalized = stateCode?.toUpperCase();

  if (!normalized) {
    return null;
  }

  const rules = await getUsStateRules();
  return rules.find((rule) => rule.state_code === normalized) ?? null;
}
