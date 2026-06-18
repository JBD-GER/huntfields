import {
  Bird,
  Bug,
  Feather,
  Fish,
  PawPrint,
  Rabbit,
  Squirrel,
  Turtle,
  type LucideIcon,
} from "lucide-react";
import { inferSpeciesCategory, type SpeciesCategory } from "@/lib/species";

const categoryIcons: Record<SpeciesCategory, LucideIcon> = {
  "big-game": PawPrint,
  "upland-birds": Bird,
  waterfowl: Feather,
  "small-game": Rabbit,
  predators: PawPrint,
  "feral-invasive": Bug,
  fish: Fish,
  other: PawPrint,
};

export function SpeciesIcon({
  name,
  category,
  className,
}: {
  name?: string;
  category?: SpeciesCategory;
  className?: string;
}) {
  const resolvedCategory = category ?? (name ? inferSpeciesCategory(name) : "other");
  const Icon = categoryIcons[resolvedCategory] ?? PawPrint;

  if (name?.toLowerCase().includes("squirrel")) {
    return <Squirrel className={className} aria-hidden="true" />;
  }

  if (name?.toLowerCase().includes("alligator")) {
    return <Turtle className={className} aria-hidden="true" />;
  }

  return <Icon className={className} aria-hidden="true" />;
}
