export type SpeciesCategory =
  | "big-game"
  | "upland-birds"
  | "waterfowl"
  | "small-game"
  | "predators"
  | "feral-invasive"
  | "fish"
  | "other";

export type HuntSpecies = {
  slug: string;
  label: string;
  category: SpeciesCategory;
  aliases: string[];
};

export const speciesCategoryLabels: Record<SpeciesCategory, string> = {
  "big-game": "Big game",
  "upland-birds": "Upland birds",
  waterfowl: "Waterfowl",
  "small-game": "Small game",
  predators: "Predators",
  "feral-invasive": "Feral / invasive",
  fish: "Fish",
  other: "Other",
};

export const huntSpecies: HuntSpecies[] = [
  {
    slug: "whitetail-deer",
    label: "Whitetail deer",
    category: "big-game",
    aliases: ["white-tailed deer", "deer"],
  },
  {
    slug: "mule-deer",
    label: "Mule deer",
    category: "big-game",
    aliases: ["deer"],
  },
  {
    slug: "elk",
    label: "Elk",
    category: "big-game",
    aliases: ["wapiti"],
  },
  {
    slug: "moose",
    label: "Moose",
    category: "big-game",
    aliases: [],
  },
  {
    slug: "black-bear",
    label: "Black bear",
    category: "big-game",
    aliases: ["bear"],
  },
  {
    slug: "pronghorn",
    label: "Pronghorn antelope",
    category: "big-game",
    aliases: ["antelope", "pronghorn"],
  },
  {
    slug: "wild-turkey",
    label: "Wild turkey",
    category: "upland-birds",
    aliases: ["turkey"],
  },
  {
    slug: "pheasant",
    label: "Pheasant",
    category: "upland-birds",
    aliases: [],
  },
  {
    slug: "quail",
    label: "Bobwhite quail",
    category: "upland-birds",
    aliases: ["quail"],
  },
  {
    slug: "grouse",
    label: "Grouse",
    category: "upland-birds",
    aliases: ["sage grouse", "ruffed grouse"],
  },
  {
    slug: "chukar",
    label: "Chukar",
    category: "upland-birds",
    aliases: [],
  },
  {
    slug: "duck",
    label: "Duck",
    category: "waterfowl",
    aliases: ["ducks", "mallard"],
  },
  {
    slug: "goose",
    label: "Goose",
    category: "waterfowl",
    aliases: ["geese", "canada goose"],
  },
  {
    slug: "rabbit",
    label: "Rabbit",
    category: "small-game",
    aliases: ["cottontail", "hare"],
  },
  {
    slug: "squirrel",
    label: "Squirrel",
    category: "small-game",
    aliases: [],
  },
  {
    slug: "coyote",
    label: "Coyote",
    category: "predators",
    aliases: [],
  },
  {
    slug: "bobcat",
    label: "Bobcat",
    category: "predators",
    aliases: [],
  },
  {
    slug: "mountain-lion",
    label: "Mountain lion",
    category: "predators",
    aliases: ["cougar", "puma"],
  },
  {
    slug: "feral-hog",
    label: "Feral hog",
    category: "feral-invasive",
    aliases: ["hog", "wild boar", "boar", "pig"],
  },
  {
    slug: "axis-deer",
    label: "Axis deer",
    category: "feral-invasive",
    aliases: ["chital"],
  },
  {
    slug: "nilgai",
    label: "Nilgai",
    category: "feral-invasive",
    aliases: [],
  },
  {
    slug: "alligator",
    label: "Alligator",
    category: "feral-invasive",
    aliases: ["gator"],
  },
  {
    slug: "bass",
    label: "Bass",
    category: "fish",
    aliases: ["largemouth bass", "smallmouth bass"],
  },
  {
    slug: "trout",
    label: "Trout",
    category: "fish",
    aliases: ["rainbow trout", "brown trout"],
  },
];

function normalizeSpeciesName(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function inferSpeciesCategory(value: string): SpeciesCategory {
  const normalized = normalizeSpeciesName(value);
  const match = huntSpecies.find(
    (species) =>
      normalizeSpeciesName(species.label) === normalized ||
      species.aliases.some((alias) => normalizeSpeciesName(alias) === normalized),
  );

  if (match) {
    return match.category;
  }

  if (/(duck|goose|geese|waterfowl|mallard)/.test(normalized)) {
    return "waterfowl";
  }

  if (/(turkey|pheasant|quail|grouse|chukar|dove|bird)/.test(normalized)) {
    return "upland-birds";
  }

  if (/(rabbit|hare|squirrel|small game)/.test(normalized)) {
    return "small-game";
  }

  if (/(coyote|bobcat|lion|cougar|predator|fox)/.test(normalized)) {
    return "predators";
  }

  if (/(hog|boar|pig|axis|nilgai|alligator|feral|invasive)/.test(normalized)) {
    return "feral-invasive";
  }

  if (/(fish|bass|trout|catfish|salmon)/.test(normalized)) {
    return "fish";
  }

  if (/(deer|elk|moose|bear|antelope|pronghorn|bison|sheep|goat)/.test(normalized)) {
    return "big-game";
  }

  return "other";
}

export function speciesSuggestions(query: string, limit = 8) {
  const normalized = normalizeSpeciesName(query);

  if (!normalized) {
    return huntSpecies.slice(0, limit);
  }

  return huntSpecies
    .map((species) => {
      const label = normalizeSpeciesName(species.label);
      const aliases = species.aliases.map(normalizeSpeciesName);
      const exact = label === normalized || aliases.includes(normalized);
      const starts = label.startsWith(normalized) || aliases.some((alias) => alias.startsWith(normalized));
      const contains =
        label.includes(normalized) || aliases.some((alias) => alias.includes(normalized));

      return {
        species,
        score: exact ? 3 : starts ? 2 : contains ? 1 : 0,
      };
    })
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score || a.species.label.localeCompare(b.species.label))
    .slice(0, limit)
    .map((result) => result.species);
}
