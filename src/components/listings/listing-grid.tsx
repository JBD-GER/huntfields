import { EmptyState, ErrorState } from "@/components/ui/state-message";
import { ListingCard } from "@/components/listings/listing-card";
import type { ListingCard as ListingCardType } from "@/lib/data/listings";

export function ListingGrid({
  listings,
  error,
  viewerCanSeeDetails = false,
}: {
  listings: ListingCardType[];
  error?: string | null;
  viewerCanSeeDetails?: boolean;
}) {
  if (error) {
    return <ErrorState message={error} />;
  }

  if (listings.length === 0) {
    return (
      <EmptyState
        title="No matching land access yet"
        description="Try a broader region or radius. The database is ready for listings as soon as landowners submit parcels."
      />
    );
  }

  return (
    <div className="grid items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {listings.map((listing) => (
        <ListingCard
          key={listing.id}
          listing={listing}
          viewerCanSeeDetails={viewerCanSeeDetails}
        />
      ))}
    </div>
  );
}
