import { getLocale } from "@/lib/i18n/server";
import { ContentPicture } from "./content-picture";

/**
 * `ContentPicture` for server components: reads the visitor's language so a
 * Welsh reader hears the owner's Welsh description (marked `cy`) where one was
 * written, and the English one (marked `en-GB`) otherwise. Client components
 * cannot read the request, so they use `ContentPicture` with a `locale`.
 */
export async function LocalisedContentPicture(
  props: Omit<React.ComponentProps<typeof ContentPicture>, "locale">,
) {
  if (!props.image) return null;
  return <ContentPicture {...props} locale={await getLocale()} />;
}
