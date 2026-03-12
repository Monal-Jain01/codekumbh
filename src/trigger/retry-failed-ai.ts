import { logger, schedules, tasks } from "@trigger.dev/sdk/v3";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { generatePropertyValuation } from "./property-valuation";
import { enrichPropertyContext } from "./property-context";
import { generateInvestmentInsights } from "./investment-insights";
import { analyzeOfferRisk } from "./analyze-offer";
import { generatePortfolio } from "./generate-portfolio";

/**
 * Scheduled retry task — runs every 30 minutes.
 * Scans the DB for rows where AI tasks previously failed or never ran,
 * and re-triggers the appropriate task for each one.
 *
 * Covers:
 *  1. Properties missing ai_property_valuations
 *  2. Properties missing property_context
 *  3. Users with properties but no ai_investment_insights
 *  4. Offers with null ai_risk_score
 *  5. Portfolios with status = 'failed'
 */
export const retryFailedAiTasks = schedules.task({
  id: "retry-failed-ai-tasks",
  // Runs every 30 minutes
  cron: "*/30 * * * *",
  maxDuration: 300,
  run: async () => {
    logger.log("🔄 Starting AI retry sweep...");

    const results = {
      valuations: 0,
      context: 0,
      insights: 0,
      offers: 0,
      portfolios: 0,
      errors: [] as string[],
    };

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 1. Properties missing AI valuation
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    logger.log("Checking for properties without AI valuation...");
    const { data: unvaluedProps, error: valErr } = await supabaseAdmin
      .from("properties")
      .select(
        `id, owner_id, title, property_type, address, city, state, country,
         area_sqft, bedrooms, bathrooms, year_built, lot_size, asking_price, description`
      )
      .not(
        "id",
        "in",
        // Subquery via RPC not possible in JS client — using a workaround:
        // fetch all valuated property IDs first
        "(SELECT property_id FROM ai_property_valuations)"
      )
      .eq("status", "active")
      .limit(15);

    if (valErr) {
      // The NOT IN subquery isn't supported in supabase-js — use a two-step approach
      logger.log("Falling back to two-step valuation check...");

      const { data: valuatedIds } = await supabaseAdmin
        .from("ai_property_valuations")
        .select("property_id");

      const valuatedSet = new Set(
        (valuatedIds ?? []).map((r: { property_id: string }) => r.property_id)
      );

      const { data: allProps } = await supabaseAdmin
        .from("properties")
        .select(
          `id, owner_id, title, property_type, address, city, state, country,
           area_sqft, bedrooms, bathrooms, year_built, lot_size, asking_price, description`
        )
        .eq("status", "active")
        .limit(50);

      const missing = (allProps ?? []).filter(
        (p: { id: string }) => !valuatedSet.has(p.id)
      );

      for (const prop of missing.slice(0, 10)) {
        try {
          await tasks.trigger<typeof generatePropertyValuation>(
            "generate-property-valuation",
            {
              propertyId: prop.id,
              userId: prop.owner_id,
              propertyData: {
                title: prop.title,
                property_type: prop.property_type,
                address: prop.address,
                city: prop.city,
                state: prop.state,
                country: prop.country,
                area_sqft: prop.area_sqft,
                bedrooms: prop.bedrooms,
                bathrooms: prop.bathrooms,
                year_built: prop.year_built,
                lot_size: prop.lot_size,
                asking_price: prop.asking_price,
                description: prop.description,
              },
            }
          );
          results.valuations++;
          logger.log(`Queued valuation retry for property ${prop.id}`);
        } catch (e) {
          results.errors.push(`valuation:${prop.id}: ${String(e)}`);
        }
      }
    } else {
      for (const prop of (unvaluedProps ?? []).slice(0, 10)) {
        try {
          await tasks.trigger<typeof generatePropertyValuation>(
            "generate-property-valuation",
            {
              propertyId: prop.id,
              userId: prop.owner_id,
              propertyData: {
                title: prop.title,
                property_type: prop.property_type,
                address: prop.address,
                city: prop.city,
                state: prop.state,
                country: prop.country,
                area_sqft: prop.area_sqft,
                bedrooms: prop.bedrooms,
                bathrooms: prop.bathrooms,
                year_built: prop.year_built,
                lot_size: prop.lot_size,
                asking_price: prop.asking_price,
                description: prop.description,
              },
            }
          );
          results.valuations++;
        } catch (e) {
          results.errors.push(`valuation:${prop.id}: ${String(e)}`);
        }
      }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 2. Properties missing property_context (two-step approach)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    logger.log("Checking for properties without property_context...");

    const { data: contextIds } = await supabaseAdmin
      .from("property_context")
      .select("property_id");

    const contextSet = new Set(
      (contextIds ?? []).map((r: { property_id: string }) => r.property_id)
    );

    const { data: contextProps } = await supabaseAdmin
      .from("properties")
      .select(
        "id, title, property_type, address, city, state, country, area_sqft, asking_price"
      )
      .eq("status", "active")
      .limit(50);

    const missingContext = (contextProps ?? []).filter(
      (p: { id: string }) => !contextSet.has(p.id)
    );

    for (const prop of missingContext.slice(0, 10)) {
      try {
        await tasks.trigger<typeof enrichPropertyContext>(
          "enrich-property-context",
          {
            propertyId: prop.id,
            propertyData: {
              title: prop.title,
              property_type: prop.property_type,
              address: prop.address,
              city: prop.city,
              state: prop.state,
              country: prop.country,
              area_sqft: prop.area_sqft,
              asking_price: prop.asking_price,
            },
          }
        );
        results.context++;
        logger.log(`Queued context retry for property ${prop.id}`);
      } catch (e) {
        results.errors.push(`context:${prop.id}: ${String(e)}`);
      }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 3. Users with properties but no ai_investment_insights
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    logger.log("Checking for users without investment insights...");

    const { data: insightsUsers } = await supabaseAdmin
      .from("ai_investment_insights")
      .select("user_id");

    const insightsUserSet = new Set(
      (insightsUsers ?? []).map((r: { user_id: string }) => r.user_id)
    );

    // Find users who have listed at least one property but have no insights row
    const { data: allListedProps } = await supabaseAdmin
      .from("properties")
      .select(
        `id, owner_id, title, property_type, address, city, state, country,
         area_sqft, bedrooms, bathrooms, asking_price`
      )
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(100);

    type ListedProp = NonNullable<typeof allListedProps>[number];

    // Group by user, take their most recent property, skip users that already have insights
    const userPropertyMap = new Map<string, ListedProp>();
    for (const prop of allListedProps ?? []) {
      if (!insightsUserSet.has(prop.owner_id) && !userPropertyMap.has(prop.owner_id)) {
        userPropertyMap.set(prop.owner_id, prop);
      }
    }

    const insightsCandidates = Array.from(userPropertyMap.values()).slice(0, 10);

    for (const prop of insightsCandidates) {
      try {
        await tasks.trigger<typeof generateInvestmentInsights>(
          "generate-investment-insights",
          {
            propertyId: prop.id,
            userId: prop.owner_id,
            propertyData: {
              title: prop.title,
              property_type: prop.property_type,
              address: prop.address,
              city: prop.city,
              state: prop.state,
              country: prop.country,
              area_sqft: prop.area_sqft,
              bedrooms: prop.bedrooms,
              bathrooms: prop.bathrooms,
              asking_price: prop.asking_price,
            },
          }
        );
        results.insights++;
        logger.log(`Queued insights retry for user ${prop.owner_id}`);
      } catch (e) {
        results.errors.push(`insights:${prop.owner_id}: ${String(e)}`);
      }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 4. Pending offers with no AI risk score
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    logger.log("Checking for offers without AI risk analysis...");

    const { data: unanalyzedOffers } = await supabaseAdmin
      .from("offers")
      .select("id, property_id, buyer_id, offer_price")
      .is("ai_risk_score", null)
      .in("status", ["pending", "countered"])
      .order("created_at", { ascending: true })
      .limit(15);

    for (const offer of unanalyzedOffers ?? []) {
      try {
        await tasks.trigger<typeof analyzeOfferRisk>("analyze-offer-risk", {
          offerId: offer.id,
          propertyId: offer.property_id,
          buyerId: offer.buyer_id,
          offerPrice: offer.offer_price,
        });
        results.offers++;
        logger.log(`Queued offer risk retry for offer ${offer.id}`);
      } catch (e) {
        results.errors.push(`offer:${offer.id}: ${String(e)}`);
      }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 5. Failed or stuck portfolios (failed | pending > 30 min old)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    logger.log("Checking for failed or stuck portfolios...");

    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

    const { data: failedPortfolios } = await supabaseAdmin
      .from("portfolios")
      .select("user_id, status, updated_at")
      .or(
        `status.eq.failed,and(status.eq.pending,updated_at.lt.${thirtyMinutesAgo}),and(status.eq.generating,updated_at.lt.${thirtyMinutesAgo})`
      )
      .limit(10);

    for (const portfolio of failedPortfolios ?? []) {
      try {
        await tasks.trigger<typeof generatePortfolio>("generate-portfolio", {
          userId: portfolio.user_id,
          trigger: "manual",
        });
        results.portfolios++;
        logger.log(
          `Queued portfolio retry for user ${portfolio.user_id} (was: ${portfolio.status})`
        );
      } catch (e) {
        results.errors.push(`portfolio:${portfolio.user_id}: ${String(e)}`);
      }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Summary
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    logger.log("✅ AI retry sweep complete", {
      valuationsQueued: results.valuations,
      contextQueued: results.context,
      insightsQueued: results.insights,
      offersQueued: results.offers,
      portfoliosQueued: results.portfolios,
      errors: results.errors.length,
      errorDetails: results.errors,
    });

    return results;
  },
});
