import fs from 'fs/promises';
import path from 'path';

const DB_DIR = path.join(process.cwd(), 'data');
const PROSPECTS_FILE = path.join(DB_DIR, 'prospects.json');
const EVENTS_FILE = path.join(DB_DIR, 'events.json');

async function ensureDb() {
  try {
    await fs.mkdir(DB_DIR, { recursive: true });
  } catch (e) {}
  
  try {
    await fs.access(PROSPECTS_FILE);
  } catch {
    await fs.writeFile(PROSPECTS_FILE, '[]');
  }
  
  try {
    await fs.access(EVENTS_FILE);
  } catch {
    await fs.writeFile(EVENTS_FILE, '[]');
  }
}

export async function getDb() {
  await ensureDb();
  return {
    async run(query: string, params: any[]) {
      if (query.startsWith('INSERT OR REPLACE INTO prospects')) {
        const prospects = JSON.parse(await fs.readFile(PROSPECTS_FILE, 'utf-8'));
        const [id, name, address, rating, user_ratings_total, website, gap_score, audit_draft, email_draft, status, audit_report] = params;
        const prospect = { id, name, address, rating, user_ratings_total, website, gap_score, audit_draft, email_draft, status, audit_report };
        const index = prospects.findIndex((p: any) => p.id === id);
        if (index >= 0) prospects[index] = prospect;
        else prospects.push(prospect);
        await fs.writeFile(PROSPECTS_FILE, JSON.stringify(prospects, null, 2));
      } else if (query.startsWith('UPDATE prospects SET status = ? WHERE id = ?')) {
        const prospects = JSON.parse(await fs.readFile(PROSPECTS_FILE, 'utf-8'));
        const [status, id] = params;
        const index = prospects.findIndex((p: any) => p.id === id);
        if (index >= 0) {
          prospects[index].status = status;
          await fs.writeFile(PROSPECTS_FILE, JSON.stringify(prospects, null, 2));
        }
      }
    },
    async get(query: string, params: any[]) {
      if (query.startsWith('SELECT * FROM prospects WHERE id = ?')) {
        const prospects = JSON.parse(await fs.readFile(PROSPECTS_FILE, 'utf-8'));
        return prospects.find((p: any) => p.id === params[0]);
      }
      return null;
    },
    async all(query: string) {
      if (query.startsWith('SELECT * FROM prospects')) {
        const prospects = JSON.parse(await fs.readFile(PROSPECTS_FILE, 'utf-8'));
        return prospects.sort((a: any, b: any) => b.gap_score - a.gap_score);
      }
      if (query.startsWith('SELECT * FROM agent_events')) {
        const events = JSON.parse(await fs.readFile(EVENTS_FILE, 'utf-8'));
        return events.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      }
      return [];
    }
  };
}

export async function logEvent(eventType: string, description: string, details: any = null) {
  await ensureDb();
  const events = JSON.parse(await fs.readFile(EVENTS_FILE, 'utf-8'));
  events.push({
    id: events.length + 1,
    event_type: eventType,
    description,
    details: details ? JSON.stringify(details) : null,
    timestamp: new Date().toISOString()
  });
  await fs.writeFile(EVENTS_FILE, JSON.stringify(events, null, 2));
}
