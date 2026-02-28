import { desc } from 'drizzle-orm';
import type { Database } from '../data/database';
import { subscribers } from '../data/drizzle-schema';

type CreateSubscribersDbArgs = {
  db: Database;
  generateId: () => string;
};

export const createSubscribersDb = ({ db, generateId }: CreateSubscribersDbArgs) => {
  const addSubscriber = (email: string, name: string) => {
    const now = Date.now();
    db.insert(subscribers).values({
      id: generateId(),
      email: email.toLowerCase().trim(),
      name: name || '',
      subscribedAt: now,
    }).execute();
    return { success: true, message: 'Subscribed successfully', subscribedAt: now };
  };

  const listSubscribers = () => {
    return db
      .select({ email: subscribers.email, name: subscribers.name, subscribedAt: subscribers.subscribedAt })
      .from(subscribers)
      .orderBy(desc(subscribers.subscribedAt));
  };

  const exportSubscribersCsv = async () => {
    const rows = await listSubscribers();
    return ['Email,Name,Subscribed At', ...rows.map(s => `${s.email},"${s.name || ''}",${new Date(s.subscribedAt).toISOString()}`)].join('\n');
  };

  return {
    addSubscriber,
    listSubscribers,
    exportSubscribersCsv,
  };
};
