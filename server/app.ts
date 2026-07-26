import express from "express";
import dotenv from "dotenv";

dotenv.config({ override: true });

export function createApp() {
  const app = express();

  app.use(express.json());

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/config", (req, res) => {
    res.json({
      hasGoogleMaps: !!process.env.GOOGLE_MAPS_API_KEY,
      hasGemini: !!process.env.GEMINI_API_KEY,
      hasStripe: !!process.env.STRIPE_SECRET_KEY,
      hasEmail: !!(process.env.SENDER_EMAIL && process.env.SENDER_APP_PASSWORD)
    });
  });

  app.post("/api/prospects/search", async (req, res) => {
    try {
      const { niche, city, isDryRun } = req.body;
      const { runProspecting } = await import("./pipeline");
      await runProspecting(niche, city, isDryRun);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/prospects", async (req, res) => {
    try {
      const { getProspects } = await import("./pipeline");
      const prospects = await getProspects();
      res.json(prospects);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/prospects/:id/send", async (req, res) => {
    try {
      const { toEmail, customDraft } = req.body;
      const { sendEmail } = await import("./pipeline");
      await sendEmail(req.params.id, toEmail, customDraft);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/checkout", async (req, res) => {
    try {
      const { placeId } = req.body;
      const { createCheckoutSession } = await import("./pipeline");
      const origin = process.env.APP_URL || req.headers.origin || "http://localhost:3000";
      const session = await createCheckoutSession(placeId, origin);
      res.json({ url: session.url });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/events", async (req, res) => {
    try {
      const { getEvents } = await import("./pipeline");
      const events = await getEvents();
      res.json(events);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  return app;
}
