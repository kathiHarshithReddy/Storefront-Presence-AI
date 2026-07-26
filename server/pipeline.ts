import { getDb, logEvent } from './db';
import { Client } from "@googlemaps/google-maps-services-js";
import { GoogleGenAI } from "@google/genai";
import nodemailer from "nodemailer";
import Stripe from "stripe";
import PDFDocument from "pdfkit";

// Initialize conditionally or lazily
let mapsClient: Client | null = null;
let ai: GoogleGenAI | null = null;
let stripeClient: Stripe | null = null;

function getMapsClient() {
  if (!mapsClient) {
    if (!process.env.GOOGLE_MAPS_API_KEY) throw new Error("GOOGLE_MAPS_API_KEY is missing");
    mapsClient = new Client({});
  }
  return mapsClient;
}

function getAi() {
  if (!ai) {
    if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is missing");
    ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return ai;
}

function getStripe() {
  if (!stripeClient) {
    if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY is missing");
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripeClient;
}

function getMailer() {
  if (!process.env.SENDER_EMAIL || !process.env.SENDER_APP_PASSWORD) {
    throw new Error("SENDER_EMAIL or SENDER_APP_PASSWORD missing");
  }
  return nodemailer.createTransport({
    service: 'gmail', // Assuming gmail for app password
    auth: {
      user: process.env.SENDER_EMAIL,
      pass: process.env.SENDER_APP_PASSWORD
    }
  });
}

function createPdfBuffer(text: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const buffers: Buffer[] = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);
    
    // Simple text formatting, stripping basic markdown
    const cleanText = text.replace(/\*\*/g, '').replace(/##/g, '').replace(/#/g, '');
    doc.fontSize(12).text(cleanText, {
      width: 410,
      align: 'left'
    });
    doc.end();
  });
}

export async function runProspecting(niche: string, city: string, isDryRun: boolean = false) {
  await logEvent("prospecting_started", `Started prospecting for ${niche} in ${city} (Dry Run: ${isDryRun})`);
  
  const db = await getDb();
  
  if (isDryRun) {
    const mockPlaceId = `mock_${Date.now()}`;
    const mockName = `Sample ${niche} of ${city}`;
    const mockAddress = `123 Main St, ${city}`;
    const mockRating = 3.5;
    const mockReviews = 14;
    const mockWebsite = null;
    
    const gapScore = 85;
    const auditSummary = "No website found and low review count (14).";
    const auditReport = `# Digital Presence Audit: ${mockName}\n\n**Gap Score: ${gapScore}/100**\n\n## Core Issues Found\n- **Missing Website**: Customers searching online cannot find a dedicated site for your services.\n- **Review Volume**: You currently have 14 reviews (3.5 avg). Having fewer reviews limits your visibility compared to competitors with higher review counts.\n\n## Our Proposal\nWe can build you a high-converting, mobile-optimized landing page and implement an automated review-collection system to help you capture more local search traffic in ${city}.`;
    const emailDraft = `Hi owner,\n\nI noticed ${mockName} doesn't have a website and currently has 14 reviews with a 3.5 average. \n\nI've attached a custom audit showing exactly how these metrics impact your visibility in ${city}. \n\nLet's chat?\n\nBest,\n[Your Name]`;

    await db.run(
      `INSERT OR REPLACE INTO prospects (id, name, address, rating, user_ratings_total, website, gap_score, audit_draft, email_draft, status, audit_report)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [mockPlaceId, mockName, mockAddress, mockRating, mockReviews, mockWebsite, gapScore, auditSummary, emailDraft, 'drafted', auditReport]
    );
    
    await logEvent("prospect_found", `Found mock prospect ${mockName} with gap score ${gapScore}`, { place_id: mockPlaceId, is_dry_run: true });
    await logEvent("prospecting_completed", `Completed mock prospecting for ${niche} in ${city}`);
    
    return [{ place_id: mockPlaceId, name: mockName }];
  }

  const maps = getMapsClient();
  const query = `${niche} in ${city}`;
  
  const response = await maps.textSearch({
    params: {
      query: query,
      key: process.env.GOOGLE_MAPS_API_KEY!
    }
  });
  
  const results = response.data.results.slice(0, 5); // Limit to 5 for now
  
  for (const place of results) {
    if (!place.place_id) continue;
    
    // Get more details
    const detailsResponse = await maps.placeDetails({
      params: {
        place_id: place.place_id,
        fields: ['name', 'formatted_address', 'rating', 'user_ratings_total', 'website'],
        key: process.env.GOOGLE_MAPS_API_KEY!
      }
    });
    
    const details = detailsResponse.data.result;
    
    // Calculate gap score and audit using Gemini
    const ai = getAi();
    const prompt = `
    Analyze this local business for digital presence gaps based ONLY on the provided data:
    Name: ${details.name}
    Rating: ${details.rating} (${details.user_ratings_total} reviews)
    Website: ${details.website || 'None'}
    
    Provide a JSON response with:
    - gap_score (0-100, higher means more need for our agency services. No website = high score, low reviews = high score)
    - audit_summary (A 2-sentence summary of what they are missing based ONLY on the numbers, e.g. no website, low review count)
    - audit_report (A clean, markdown-formatted 1-page report showing their gap score, specific issues found derived ONLY from the provided data, and a pitch paragraph for our paid local SEO/website service. Do NOT make unverifiable claims like 'competitors outranking you' unless framed generally.)
    - email_draft (A polite cold email offering to help them improve their local SEO and online presence, mentioning their specific numbers (rating, review count, website presence), and referencing the attached audit report. Do NOT speculate on why their rating is what it is, just state the facts. Leave a placeholder [Your Name] for the sender).
    `;
    
    const aiResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });
    
    const aiData = JSON.parse(aiResponse.text || "{}");
    
    await db.run(
      `INSERT OR REPLACE INTO prospects (id, name, address, rating, user_ratings_total, website, gap_score, audit_draft, email_draft, status, audit_report)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [place.place_id, details.name, details.formatted_address, details.rating, details.user_ratings_total, details.website, aiData.gap_score, aiData.audit_summary, aiData.email_draft, 'drafted', aiData.audit_report]
    );
    
    await logEvent("prospect_found", `Found prospect ${details.name} with gap score ${aiData.gap_score}`, { place_id: place.place_id });
  }
  
  await logEvent("prospecting_completed", `Completed prospecting for ${niche} in ${city}`);
  return results;
}

export async function getProspects() {
  const db = await getDb();
  return await db.all("SELECT * FROM prospects ORDER BY gap_score DESC");
}

export async function sendEmail(placeId: string, toEmail: string, customDraft?: string) {
  const db = await getDb();
  const prospect = await db.get("SELECT * FROM prospects WHERE id = ?", [placeId]);
  
  if (!prospect) throw new Error("Prospect not found");
  
  const emailContent = customDraft || prospect.email_draft;
  
  const mailer = getMailer();
  
  const mailOptions: nodemailer.SendMailOptions = {
    from: process.env.SENDER_EMAIL,
    to: toEmail,
    subject: `Ideas for ${prospect.name}'s online presence`,
    text: emailContent
  };

  if (prospect.audit_report) {
    const pdfBuffer = await createPdfBuffer(prospect.audit_report);
    const filename = `${prospect.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_audit.pdf`;
    mailOptions.attachments = [
      {
        filename,
        content: pdfBuffer,
        contentType: 'application/pdf'
      }
    ];
  }
  
  await mailer.sendMail(mailOptions);
  
  await db.run("UPDATE prospects SET status = ? WHERE id = ?", ['sent', placeId]);
  await logEvent("email_sent", `Sent email to ${prospect.name} (${toEmail})`, { place_id: placeId });
}

export async function createCheckoutSession(placeId: string, origin: string) {
  const stripe = getStripe();
  const db = await getDb();
  const prospect = await db.get("SELECT * FROM prospects WHERE id = ?", [placeId]);

  if (!prospect) throw new Error("Prospect not found");

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Website & SEO Package for ${prospect.name}`,
          },
          unit_amount: 50000, // $500.00
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: `${origin}?success=true`,
    cancel_url: `${origin}?canceled=true`,
  });

  await logEvent("checkout_created", `Created checkout session for ${prospect.name}`, { place_id: placeId });
  return session;
}

export async function getEvents() {
  const db = await getDb();
  return await db.all("SELECT * FROM events ORDER BY timestamp DESC");
}
