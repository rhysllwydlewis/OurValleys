import { upcomingBankHolidays } from "@/modules/businesses/bank-holidays";
import { getOwnerOpeningHours } from "@/modules/businesses/opening-hours";
import { londonDateString } from "@/modules/businesses/opening-hours-exceptions";
import { OpeningHoursSection } from "../opening-hours-section";

export async function OpeningHoursLoader({
  businessId,
  canEdit,
}: {
  businessId: string;
  canEdit: boolean;
}) {
  const openingHours = await getOwnerOpeningHours(businessId);

  return (
    <OpeningHoursSection
      businessId={businessId}
      canEdit={canEdit}
      hours={openingHours}
      today={londonDateString(new Date())}
      suggestions={upcomingBankHolidays({
        alreadySet:
          openingHours.state === "ready"
            ? openingHours.specialDays.map((day) => day.date)
            : [],
      })}
    />
  );
}
