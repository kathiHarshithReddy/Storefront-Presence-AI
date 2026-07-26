import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config({ override: true });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes
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

  // Pipeline routes
  app.post("/api/prospects/search", async (req, res) => {
    try {
      const { niche, city, isDryRun } = req.body;
      const { runProspecting } = await import("./server/pipeline");
      await runProspecting(niche, city, isDryRun);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/prospects", async (req, res) => {
    try {
      const { getProspects } = await import("./server/pipeline");
      const prospects = await getProspects();
      res.json(prospects);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/prospects/:id/send", async (req, res) => {
    try {
      const { toEmail, customDraft } = req.body;
      const { sendEmail } = await import("./server/pipeline");
      await sendEmail(req.params.id, toEmail, customDraft);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/checkout", async (req, res) => {
    try {
      const { placeId } = req.body;
      const { createCheckoutSession } = await import("./server/pipeline");
      // Use app origin from env or fallback
      const origin = process.env.APP_URL || req.headers.origin || `http://localhost:${PORT}`;
      const session = await createCheckoutSession(placeId, origin);
      res.json({ url: session.url });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/events", async (req, res) => {
    try {
      const { getEvents } = await import("./server/pipeline");
      const events = await getEvents();
      res.json(events);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
