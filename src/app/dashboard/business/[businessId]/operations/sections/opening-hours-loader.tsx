import { businessPermissions } from "@/modules/businesses/permissions";
import { hasPermission } from "./shared";
import { upcomingBankHolidays } from "@/modules/businesses/bank-holidays";
import { getOwnerOpeningHours } from "@/modules/businesses/opening-hours";
import { londonDateString } from "@/modules/businesses/opening-hours-exceptions";
import { getBusinessLifecycleView } from "@/modules/businesses/lifecycle-automation";
import { OpeningHoursSection } from "../opening-hours-section";

export async function OpeningHoursLoader({
  businessId,
  userId,
}: {
  businessId: string;
  userId: string;
}) {
  const canEditPromise = hasPermission(
    userId,
    businessId,
    businessPermissions.editProfile,
  );
  const [openingHours, lifecycle] = await Promise.all([
    getOwnerOpeningHours(businessId),
    getBusinessLifecycleView(businessId),
  ]);
  const canEdit = await canEditPromise;

  return (
    <OpeningHoursSection
      businessId={businessId}
      active={!lifecycle || lifecycle.state === "active"}
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
