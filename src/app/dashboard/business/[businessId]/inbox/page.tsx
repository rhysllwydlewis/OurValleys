import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getAuth } from "@/lib/auth";
import { authoredTextLang } from "@/lib/i18n/business-copy";
import { LOCALE_DETAILS, type Locale } from "@/lib/i18n/config";
import { getTranslator } from "@/lib/i18n/server";
import type { MessageKey, Translator } from "@/lib/i18n/translate";
import { canUseBusinessOperationsTools } from "@/lib/public-demo-policy";
import { listAccessibleBusinesses } from "@/modules/businesses/account-access";
import { enquiryWaitingDays } from "@/modules/businesses/contacts-and-enquiries";
import {
  getInboxCounts,
  getInboxEnquiry,
  listInbox,
  type InboxEnquiry,
} from "@/modules/businesses/inbox";
import {
  buildInboxHref,
  bulkStatuses,
  inboxBoxes,
  inboxKinds,
  messageSnippet,
  parseInboxQuery,
  replyTemplatesFor,
  senderInitials,
  type InboxQuery,
} from "@/modules/businesses/inbox-model";
import {
  businessPermissions,
  canUserAccessBusiness,
} from "@/modules/businesses/permissions";
import { DashboardTabs } from "../_hub/dashboard-tabs";
import hubStyles from "../_hub/hub.module.css";
import {
  bulkEnquiryStatusAction,
  deleteEnquiryFromInboxAction,
  setEnquiryStatusAction,
} from "./actions";
import styles from "./inbox.module.css";
import { MarkReadOnOpen } from "./mark-read";
import { ReplyComposer } from "./reply-composer";
import { SelectAll } from "./select-all";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  return {
    title: t("inbox.metaTitle"),
    robots: { index: false, follow: false },
  };
}

type PageProps = {
  params: Promise<{ businessId: string }>;
  searchParams: Promise<{
    box?: string;
    kind?: string;
    q?: string;
    page?: string;
    enquiry?: string;
    outcome?: string;
    n?: string;
  }>;
};

async function readSession() {
  try {
    return await getAuth().api.getSession({ headers: await headers() });
  } catch {
    return null;
  }
}

const simpleOutcomes = [
  "replied",
  "status-new",
  "status-read",
  "status-closed",
  "status-archived",
  "status-spam",
  "deleted",
  "nothing-selected",
  "forbidden",
  "invalid",
  "not_found",
  "no_email",
  "rate_limited",
  "unavailable",
] as const;

function outcomeMessage(
  outcome: string | undefined,
  count: string | undefined,
  t: Translator,
): { text: string; tone: "good" | "bad" } | null {
  if (!outcome) return null;
  if (outcome.startsWith("bulk-")) {
    const n = Math.max(0, Math.min(1000, Number(count) || 0));
    return {
      tone: "good",
      text:
        n === 0
          ? t("inbox.outcome.bulk.none")
          : t(n === 1 ? "inbox.outcome.bulk.one" : "inbox.outcome.bulk.other", {
              count: n,
            }),
    };
  }
  if (!(simpleOutcomes as readonly string[]).includes(outcome)) return null;
  const bad = ![
    "replied",
    "status-new",
    "status-read",
    "status-closed",
    "status-archived",
    "status-spam",
    "deleted",
  ].includes(outcome);
  return {
    tone: bad ? "bad" : "good",
    text: t(`inbox.outcome.${outcome}` as MessageKey),
  };
}

function formatListTime(value: Date, locale: Locale, now: Date): string {
  const htmlLang = LOCALE_DETAILS[locale].htmlLang;
  const day = (date: Date) =>
    new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(
      date,
    );
  if (day(value) === day(now)) {
    return new Intl.DateTimeFormat(htmlLang, {
      timeStyle: "short",
      timeZone: "Europe/London",
    }).format(value);
  }
  return new Intl.DateTimeFormat(htmlLang, {
    day: "numeric",
    month: "short",
    timeZone: "Europe/London",
  }).format(value);
}

function formatFull(value: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(LOCALE_DETAILS[locale].htmlLang, {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/London",
  }).format(value);
}

function stateFields(query: InboxQuery): Record<string, string> {
  const fields: Record<string, string> = { box: query.box };
  if (query.kind) fields.kind = query.kind;
  if (query.q) fields.q = query.q;
  if (query.page > 1) fields.page = String(query.page);
  return fields;
}

function HiddenState({ fields }: { fields: Record<string, string> }) {
  return Object.entries(fields).map(([name, value]) => (
    <input key={name} type="hidden" name={name} value={value} />
  ));
}

function statusButtons(status: InboxEnquiry["status"]): {
  status: "new" | "read" | "closed" | "archived" | "spam";
  key: MessageKey;
}[] {
  switch (status) {
    case "new":
      return [
        { status: "read", key: "inbox.act.read" },
        { status: "closed", key: "inbox.act.closed" },
        { status: "archived", key: "inbox.act.archived" },
        { status: "spam", key: "inbox.act.spam" },
      ];
    case "read":
      return [
        { status: "closed", key: "inbox.act.closed" },
        { status: "new", key: "inbox.act.new" },
        { status: "archived", key: "inbox.act.archived" },
        { status: "spam", key: "inbox.act.spam" },
      ];
    case "replied":
      return [
        { status: "closed", key: "inbox.act.closed" },
        { status: "archived", key: "inbox.act.archived" },
        { status: "spam", key: "inbox.act.spam" },
      ];
    case "closed":
      return [
        { status: "read", key: "inbox.act.reopen" },
        { status: "archived", key: "inbox.act.archived" },
        { status: "spam", key: "inbox.act.spam" },
      ];
    case "archived":
      return [
        { status: "read", key: "inbox.act.reopen" },
        { status: "closed", key: "inbox.act.closed" },
        { status: "spam", key: "inbox.act.spam" },
      ];
    case "spam":
      return [{ status: "read", key: "inbox.act.notSpam" }];
  }
}

export default async function BusinessInboxPage({
  params,
  searchParams,
}: PageProps) {
  const { locale, t } = await getTranslator();
  const htmlLang = LOCALE_DETAILS[locale].htmlLang;
  const session = await readSession();
  if (!session) redirect("/login?next=/account");

  const { businessId } = await params;
  const parsedBusinessId = z.uuid().safeParse(businessId);
  if (!parsedBusinessId.success) notFound();
  const id = parsedBusinessId.data;

  const canView = await canUserAccessBusiness({
    userId: session.user.id,
    businessId: id,
    permission: businessPermissions.view,
  });
  if (!canView) notFound();

  // Enquiries hold customers' contact details, so this page needs the
  // enquiries permission itself; the proxy only guards the operations route.
  const [canManage, memberships] = await Promise.all([
    canUserAccessBusiness({
      userId: session.user.id,
      businessId: id,
      permission: businessPermissions.manageEnquiries,
    }),
    listAccessibleBusinesses(session.user.id).catch(() => []),
  ]);
  if (!canManage || !canUseBusinessOperationsTools(session.user.email)) {
    redirect(`/dashboard/business/${id}`);
  }
  const summary = memberships.find((item) => item.id === id);
  if (!summary) notFound();

  const raw = await searchParams;
  const query = parseInboxQuery(raw);
  const [inbox, countsResult, selected] = await Promise.all([
    listInbox(id, query),
    getInboxCounts(id),
    query.enquiryId ? getInboxEnquiry(id, query.enquiryId) : null,
  ]);
  const counts = countsResult.counts;
  const effectiveQuery = { ...query, page: inbox.page };
  const state = stateFields(effectiveQuery);
  const now = new Date();
  const outcome = outcomeMessage(raw.outcome, raw.n, t);
  const bulkFormId = "inbox-bulk";
  const hasSelection = query.enquiryId !== null;
  const unavailable = !inbox.available || !countsResult.available;
  const filtered = Boolean(query.q || query.kind);

  const emptyKey = (
    filtered ? "inbox.empty.search" : `inbox.empty.${query.box}`
  ) as MessageKey;

  return (
    <>
      <SiteHeader />
      <main className={`dashboard-shell ${hubStyles.wide}`} lang={htmlLang}>
        <nav className="business-breadcrumb" aria-label={t("dash.breadcrumb")}>
          <Link href={`/dashboard/business/${id}` as Route}>
            <span aria-hidden="true">← </span>
            {t("inbox.back")}
          </Link>
        </nav>
        <header className={hubStyles.header}>
          <div>
            <p className="eyebrow">{t("inbox.eyebrow")}</p>
            <h1>{t("inbox.title")}</h1>
            <p className="lead">
              <span lang={authoredTextLang}>{summary.tradingName}</span>
              {" · "}
              {t("inbox.lead")}
            </p>
          </div>
          <div className={hubStyles.headerActions}>
            <a
              className="button"
              href={`/dashboard/business/${id}/operations/enquiries/export`}
            >
              {t("inbox.export")}
            </a>
            <Link className="button" href={`/b/${summary.slug}` as Route}>
              {t("inbox.viewSite")}
            </Link>
          </div>
        </header>
        <DashboardTabs businessId={id} current="inbox" canDesign canOperate />

        {outcome ? (
          <p
            className={styles.notice}
            data-tone={outcome.tone}
            role={outcome.tone === "bad" ? "alert" : "status"}
          >
            {outcome.text}
          </p>
        ) : null}
        {unavailable ? (
          <p className={styles.notice} data-tone="bad" role="alert">
            {t("inbox.unavailable")}
          </p>
        ) : null}

        <nav className={styles.boxes} aria-label={t("inbox.boxesAria")}>
          <ul>
            {inboxBoxes.map((box) => (
              <li key={box}>
                <Link
                  className={styles.box}
                  href={
                    buildInboxHref(id, effectiveQuery, {
                      box,
                      page: 1,
                      enquiryId: null,
                    }) as Route
                  }
                  aria-current={query.box === box ? "page" : undefined}
                  data-attention={
                    box === "unread" && counts.unread > 0 ? "true" : undefined
                  }
                >
                  {t(`inbox.box.${box}` as MessageKey)}
                  <span className={styles.boxCount}>{counts[box]}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <form
          className={styles.search}
          method="get"
          action={`/dashboard/business/${id}/inbox`}
          role="search"
        >
          {query.box !== "inbox" ? (
            <input type="hidden" name="box" value={query.box} />
          ) : null}
          <div className={styles.searchField}>
            <label htmlFor="inbox-q">{t("inbox.search.label")}</label>
            <input
              id="inbox-q"
              name="q"
              type="search"
              defaultValue={query.q}
              maxLength={80}
              placeholder={t("inbox.search.placeholder")}
            />
          </div>
          <div className={styles.searchKind}>
            <label htmlFor="inbox-kind">{t("inbox.kindFilter.label")}</label>
            <select id="inbox-kind" name="kind" defaultValue={query.kind ?? ""}>
              <option value="">{t("inbox.kindFilter.all")}</option>
              {inboxKinds.map((kind) => (
                <option key={kind} value={kind}>
                  {t(`inbox.kind.${kind}` as MessageKey)}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.searchActions}>
            <button className="button primary" type="submit">
              {t("inbox.search.submit")}
            </button>
            {filtered ? (
              <Link
                className="button"
                href={
                  buildInboxHref(id, effectiveQuery, {
                    q: "",
                    kind: null,
                    page: 1,
                    enquiryId: null,
                  }) as Route
                }
              >
                {t("inbox.search.clear")}
              </Link>
            ) : null}
          </div>
        </form>

        <div
          className={styles.workspace}
          data-has-selection={hasSelection ? "true" : "false"}
        >
          <section
            className={styles.listPane}
            aria-label={t("inbox.list.aria")}
          >
            <form
              id={bulkFormId}
              action={bulkEnquiryStatusAction}
              className={styles.bulk}
            >
              <input type="hidden" name="businessId" value={id} />
              <HiddenState fields={state} />
              <div className={styles.listHead}>
                <SelectAll
                  formId={bulkFormId}
                  label={t("inbox.list.selectAll")}
                />
                <p className={styles.muted} aria-live="polite">
                  {t(
                    inbox.total === 1
                      ? "inbox.list.count.one"
                      : "inbox.list.count.other",
                    { count: inbox.total },
                  )}
                </p>
              </div>
              {inbox.enquiries.length > 0 ? (
                <div
                  className={styles.bulkBar}
                  role="group"
                  aria-label={t("inbox.bulk.label")}
                >
                  {bulkStatuses.map((status) => (
                    <button
                      key={status}
                      className={styles.bulkButton}
                      type="submit"
                      name="status"
                      value={status}
                    >
                      {t(`inbox.bulk.${status}` as MessageKey)}
                    </button>
                  ))}
                </div>
              ) : null}
              {inbox.enquiries.length === 0 ? (
                <div className={styles.empty}>
                  <p>{t(emptyKey)}</p>
                  {filtered ? (
                    <>
                      <p className={styles.muted}>
                        {t("inbox.empty.searchHint")}
                      </p>
                      <Link
                        className="button"
                        href={
                          buildInboxHref(id, effectiveQuery, {
                            box: "all",
                            q: "",
                            kind: null,
                            page: 1,
                            enquiryId: null,
                          }) as Route
                        }
                      >
                        {t("inbox.showAll")}
                      </Link>
                    </>
                  ) : null}
                </div>
              ) : (
                <ol className={styles.rows}>
                  {inbox.enquiries.map((enquiry) => {
                    const unread = enquiry.status === "new";
                    const waiting = enquiryWaitingDays(enquiry, now);
                    const isOpen = enquiry.id === query.enquiryId;
                    return (
                      <li
                        key={enquiry.id}
                        className={styles.row}
                        data-unread={unread ? "true" : undefined}
                        data-open={isOpen ? "true" : undefined}
                      >
                        <input
                          className={styles.rowCheck}
                          type="checkbox"
                          name="ids"
                          value={enquiry.id}
                          aria-label={t("inbox.list.select", {
                            name: enquiry.senderName,
                          })}
                        />
                        <Link
                          className={styles.rowLink}
                          href={
                            buildInboxHref(id, effectiveQuery, {
                              enquiryId: enquiry.id,
                            }) as Route
                          }
                          aria-current={isOpen ? "true" : undefined}
                          aria-label={t("inbox.list.open", {
                            name: enquiry.senderName,
                          })}
                        >
                          <span className={styles.avatar} aria-hidden="true">
                            {senderInitials(enquiry.senderName)}
                          </span>
                          <span className={styles.rowBody}>
                            <span className={styles.rowTop}>
                              <strong lang={authoredTextLang}>
                                {enquiry.senderName}
                              </strong>
                              <time
                                dateTime={enquiry.submittedAt.toISOString()}
                              >
                                {formatListTime(
                                  enquiry.submittedAt,
                                  locale,
                                  now,
                                )}
                              </time>
                            </span>
                            <span
                              className={styles.snippet}
                              lang={authoredTextLang}
                            >
                              {messageSnippet(enquiry.message)}
                            </span>
                            <span className={styles.tags}>
                              <span className={styles.tag}>
                                {t(`inbox.kind.${enquiry.kind}` as MessageKey)}
                              </span>
                              {unread ? (
                                <span className={styles.tag} data-tone="new">
                                  {t("inbox.list.unread")}
                                </span>
                              ) : enquiry.status !== "read" ? (
                                <span className={styles.tag}>
                                  {t(
                                    `inbox.status.${enquiry.status}` as MessageKey,
                                  )}
                                </span>
                              ) : null}
                              {waiting !== null && waiting >= 1 ? (
                                <span
                                  className={styles.tag}
                                  data-tone={waiting >= 3 ? "late" : undefined}
                                >
                                  {t(
                                    waiting === 1
                                      ? "inbox.list.waiting.one"
                                      : "inbox.list.waiting.other",
                                    { days: waiting },
                                  )}
                                </span>
                              ) : null}
                            </span>
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ol>
              )}
              {inbox.enquiries.length > 0 ? (
                <p className={styles.muted}>{t("inbox.bulk.hint")}</p>
              ) : null}
            </form>
            {inbox.page > 1 || inbox.hasNextPage ? (
              <nav className={styles.pager} aria-label={t("inbox.list.aria")}>
                {inbox.page > 1 ? (
                  <Link
                    className="button"
                    rel="prev"
                    href={
                      buildInboxHref(id, effectiveQuery, {
                        page: inbox.page - 1,
                        enquiryId: null,
                      }) as Route
                    }
                  >
                    {t("inbox.page.previous")}
                  </Link>
                ) : null}
                <span className={styles.muted}>
                  {t("inbox.page.status", { page: inbox.page })}
                </span>
                {inbox.hasNextPage ? (
                  <Link
                    className="button"
                    rel="next"
                    href={
                      buildInboxHref(id, effectiveQuery, {
                        page: inbox.page + 1,
                        enquiryId: null,
                      }) as Route
                    }
                  >
                    {t("inbox.page.next")}
                  </Link>
                ) : null}
              </nav>
            ) : null}
          </section>

          <section className={styles.readPane} aria-live="polite">
            {hasSelection ? (
              <Link
                className={styles.backToList}
                href={
                  buildInboxHref(id, effectiveQuery, {
                    enquiryId: null,
                  }) as Route
                }
              >
                <span aria-hidden="true">← </span>
                {t("inbox.pane.back")}
              </Link>
            ) : null}
            {selected ? (
              <EnquiryPane
                key={selected.id}
                businessId={id}
                businessName={summary.tradingName}
                enquiry={selected}
                state={state}
                locale={locale}
                t={t}
              />
            ) : hasSelection ? (
              <p className={styles.empty}>{t("inbox.pane.notFound")}</p>
            ) : (
              <div className={styles.paneEmpty}>
                <h2>{t("inbox.pane.emptyTitle")}</h2>
                <p className={styles.muted}>{t("inbox.pane.emptyBody")}</p>
              </div>
            )}
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

function EnquiryPane({
  businessId,
  businessName,
  enquiry,
  state,
  locale,
  t,
}: {
  businessId: string;
  businessName: string;
  enquiry: InboxEnquiry;
  state: Record<string, string>;
  locale: Locale;
  t: Translator;
}) {
  const templates = replyTemplatesFor(enquiry.kind).map((templateId) => ({
    id: templateId,
    label: t(`inbox.reply.template.${templateId}` as MessageKey),
    text: t(`inbox.reply.text.${templateId}` as MessageKey, {
      name: enquiry.senderName,
      business: businessName,
    }),
  }));
  const hasContact = Boolean(enquiry.senderEmail || enquiry.senderPhone);

  return (
    <article className={styles.detail} aria-labelledby="enquiry-title">
      {enquiry.status === "new" ? (
        <MarkReadOnOpen businessId={businessId} enquiryId={enquiry.id} />
      ) : null}
      <header className={styles.detailHead}>
        <span className={styles.avatarLarge} aria-hidden="true">
          {senderInitials(enquiry.senderName)}
        </span>
        <div>
          <h2 id="enquiry-title" lang={authoredTextLang}>
            {enquiry.senderName}
          </h2>
          <p className={styles.muted}>
            {t(`inbox.kind.${enquiry.kind}` as MessageKey)}
            {" · "}
            {t("inbox.pane.received", {
              date: formatFull(enquiry.submittedAt, locale),
            })}
          </p>
        </div>
        <span className={styles.statusPill} data-status={enquiry.status}>
          {t(`inbox.status.${enquiry.status}` as MessageKey)}
        </span>
      </header>
      {enquiry.firstRepliedAt ? (
        <p className={styles.muted}>
          {t("inbox.pane.firstReplied", {
            date: formatFull(enquiry.firstRepliedAt, locale),
          })}
        </p>
      ) : null}

      <h3>{t("inbox.pane.message")}</h3>
      <p className={styles.message} lang={authoredTextLang}>
        {enquiry.message}
      </p>

      <h3>{t("inbox.pane.contact")}</h3>
      {hasContact ? (
        <dl className={styles.contact}>
          {enquiry.senderEmail ? (
            <div>
              <dt>{t("inbox.pane.email")}</dt>
              <dd>
                <a href={`mailto:${enquiry.senderEmail}`}>
                  {enquiry.senderEmail}
                </a>
              </dd>
            </div>
          ) : null}
          {enquiry.senderPhone ? (
            <div>
              <dt>{t("inbox.pane.phone")}</dt>
              <dd>
                <a
                  href={`tel:${enquiry.senderPhone.replaceAll(/[^+\d]/g, "")}`}
                >
                  {enquiry.senderPhone}
                </a>
              </dd>
            </div>
          ) : null}
          {enquiry.preferredTime ? (
            <div>
              <dt>{t("inbox.pane.preferredTime")}</dt>
              <dd lang={authoredTextLang}>{enquiry.preferredTime}</dd>
            </div>
          ) : null}
        </dl>
      ) : (
        <p className={styles.muted}>{t("inbox.pane.noContact")}</p>
      )}

      <h3>{t("inbox.reply.title")}</h3>
      {enquiry.senderEmail ? (
        <ReplyComposer
          businessId={businessId}
          enquiryId={enquiry.id}
          hidden={state}
          templates={templates}
          labels={{
            templates: t("inbox.reply.templates"),
            reply: t("inbox.reply.label", { name: enquiry.senderName }),
            note: t("inbox.reply.note", { name: enquiry.senderName }),
            remaining: t("inbox.reply.remaining", { count: "{count}" }),
            send: t("inbox.reply.send"),
            sending: t("inbox.reply.sending"),
          }}
        />
      ) : (
        <p className={styles.muted}>
          {t("inbox.reply.noEmail", { name: enquiry.senderName })}
        </p>
      )}

      <h3>{t("inbox.act.title")}</h3>
      <div className={styles.actions}>
        {statusButtons(enquiry.status).map((action) => (
          <form key={action.status} action={setEnquiryStatusAction}>
            <input type="hidden" name="businessId" value={businessId} />
            <input type="hidden" name="enquiryId" value={enquiry.id} />
            <input type="hidden" name="enquiry" value={enquiry.id} />
            <input type="hidden" name="status" value={action.status} />
            <HiddenState fields={state} />
            <button className="button" type="submit">
              {t(action.key)}
            </button>
          </form>
        ))}
      </div>
      <details className={styles.danger}>
        <summary>{t("inbox.act.delete")}</summary>
        <form action={deleteEnquiryFromInboxAction}>
          <input type="hidden" name="businessId" value={businessId} />
          <input type="hidden" name="enquiryId" value={enquiry.id} />
          <HiddenState fields={state} />
          <p>
            <strong>{t("inbox.act.deleteTitle")}</strong>
          </p>
          <p className={styles.muted}>{t("inbox.act.deleteBody")}</p>
          <button className={`button ${styles.dangerButton}`} type="submit">
            {t("inbox.act.deleteConfirm")}
          </button>
        </form>
      </details>
    </article>
  );
}
