import { Resend } from "resend";
import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";
import type { ScoredStock } from "./lib/types";

/**
 * Stage 4: notify subscribed users about the top picks from Stage 3.
 *
 * Reads notification_preferences + push_subscriptions from Supabase (via
 * the service role key, which bypasses RLS — this runs server-side only,
 * never ship the service role key to the client).
 */
export async function runNotifications(topPicks: ScoredStock[]) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: prefs, error } = await supabase
    .from("notification_preferences")
    .select("user_id, email_enabled, push_enabled, min_composite_score, profiles(email)")
    .or("email_enabled.eq.true,push_enabled.eq.true");

  if (error) {
    console.error("Failed to load notification preferences:", error);
    return;
  }

  for (const pref of prefs ?? []) {
    // TODO: use pref.min_composite_score to personalize which picks each
    // user actually gets notified about, rather than sending everyone the
    // same list.
    const relevantPicks = topPicks.filter(
      (p) => p.compositeScore >= (pref.min_composite_score ?? 0)
    );
    if (relevantPicks.length === 0) continue;

    if (pref.email_enabled) {
      await sendEmailNotification(pref, relevantPicks);
    }
    if (pref.push_enabled) {
      await sendPushNotification(supabase, pref.user_id, relevantPicks);
    }
  }
}

async function sendEmailNotification(
  pref: { user_id: string; profiles?: { email?: string } | { email?: string }[] },
  picks: ScoredStock[]
) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const email = Array.isArray(pref.profiles) ? pref.profiles[0]?.email : pref.profiles?.email;
  if (!email) return;

  // TODO: build a real HTML template — this is a placeholder.
  const tickerList = picks.map((p) => `${p.ticker} (score: ${p.compositeScore.toFixed(2)})`).join(", ");

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: email,
    subject: `Today's top picks: ${picks.length} stocks`,
    text: `Today's top picks: ${tickerList}`,
  });
}

async function sendPushNotification(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  picks: ScoredStock[]
) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );

  const { data: subscriptions } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth_key")
    .eq("user_id", userId);

  const payload = JSON.stringify({
    title: "Today's top picks",
    body: `${picks.length} new picks — top: ${picks[0]?.ticker}`,
  });

  for (const sub of subscriptions ?? []) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth_key },
        },
        payload
      );
    } catch (err) {
      // TODO: if this fails with a 410 Gone, the subscription is stale —
      // delete it from push_subscriptions.
      console.error(`Push failed for subscription ${sub.endpoint}:`, err);
    }
  }
}
