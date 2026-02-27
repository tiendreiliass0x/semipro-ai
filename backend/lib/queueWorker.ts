import IORedis from 'ioredis';
import { Queue, Worker } from 'bullmq';
import { buildQueueRunJobId, sanitizeQueueToken } from './queueIds';

type StartQueueWorkersArgs = {
  processStoryboardImageQueue: (jobId?: string) => Promise<void>;
  processSceneVideoQueue: (jobId?: string) => Promise<void>;
  processFinalFilmQueue: (jobId?: string) => Promise<void>;
  onLog?: (message: string) => void;
};

type QueueBackend = 'polling' | 'bullmq';

const QUEUE_PROVIDER = String(process.env.QUEUE_PROVIDER || process.env.QUEUE_BACKEND || 'auto').trim().toLowerCase();
const REDIS_URL = String(process.env.REDIS_URL || process.env.BULLMQ_REDIS_URL || '').trim();
const QUEUE_NAME = String(process.env.QUEUE_NAME || 'yenengalabs:jobs').trim() || 'yenengalabs:jobs';
const QUEUE_PREFIX = String(process.env.BULLMQ_PREFIX || '').trim();
const QUEUE_CONCURRENCY = Math.max(1, Math.floor(Number(process.env.QUEUE_CONCURRENCY || '1')));

const QUEUE_NAME_SAFE = sanitizeQueueToken(QUEUE_NAME);
const STORYBOARD_IMAGE_QUEUE = `${QUEUE_NAME_SAFE}-storyboard-image`;
const SCENE_VIDEO_QUEUE = `${QUEUE_NAME_SAFE}-scene-video`;
const FINAL_FILM_QUEUE = `${QUEUE_NAME_SAFE}-final-film`;

const resolveQueueBackend = (): QueueBackend => {
  if (QUEUE_PROVIDER === 'polling' || QUEUE_PROVIDER === 'sqlite') return 'polling';
  if (QUEUE_PROVIDER === 'bullmq') {
    if (!REDIS_URL) throw new Error('QUEUE_PROVIDER=bullmq requires REDIS_URL');
    return 'bullmq';
  }
  return REDIS_URL ? 'bullmq' : 'polling';
};

const queueBackend = resolveQueueBackend();

let producerConnection: IORedis | null = null;
let consumerConnection: IORedis | null = null;
let storyboardImageQueue: Queue<{ jobId: string; enqueuedAt: number }> | null = null;
let sceneQueue: Queue<{ jobId: string; enqueuedAt: number }> | null = null;
let finalFilmQueue: Queue<{ jobId: string; enqueuedAt: number }> | null = null;

type QueueCounts = {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
};

type QueueSnapshot = {
  name: string;
  counts: QueueCounts;
  recentFailed: Array<{
    id: string;
    name: string;
    failedReason: string;
    timestamp: number;
  }>;
};

export type QueueDashboardData = {
  backend: QueueBackend;
  timestamp: number;
  queues: QueueSnapshot[];
};

export type BullMqQueueHandle = Queue<{ jobId: string; enqueuedAt: number }>;

const queueOptions = (connection: IORedis) => ({
  connection,
  ...(QUEUE_PREFIX ? { prefix: QUEUE_PREFIX } : {}),
});

const ensureProducerConnection = () => {
  if (producerConnection) return producerConnection;
  if (!REDIS_URL) throw new Error('Missing REDIS_URL for bullmq queue backend');
  producerConnection = new IORedis(REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
  });
  producerConnection.on('error', error => {
    const message = error instanceof Error ? error.message : 'unknown error';
    console.error(`[queue] BullMQ producer connection error: ${message}`);
  });
  return producerConnection;
};

const ensureConsumerConnection = () => {
  if (consumerConnection) return consumerConnection;
  if (!REDIS_URL) throw new Error('Missing REDIS_URL for bullmq queue backend');
  consumerConnection = new IORedis(REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
  });
  consumerConnection.on('error', error => {
    const message = error instanceof Error ? error.message : 'unknown error';
    console.error(`[queue] BullMQ consumer connection error: ${message}`);
  });
  return consumerConnection;
};

const getSceneQueue = () => {
  if (!sceneQueue) {
    const connection = ensureProducerConnection();
    sceneQueue = new Queue(SCENE_VIDEO_QUEUE, {
      ...queueOptions(connection),
      defaultJobOptions: {
        removeOnComplete: 200,
        removeOnFail: 500,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      },
    });
  }
  return sceneQueue;
};

const getStoryboardImageQueue = () => {
  if (!storyboardImageQueue) {
    const connection = ensureProducerConnection();
    storyboardImageQueue = new Queue(STORYBOARD_IMAGE_QUEUE, {
      ...queueOptions(connection),
      defaultJobOptions: {
        removeOnComplete: 200,
        removeOnFail: 500,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      },
    });
  }
  return storyboardImageQueue;
};

const getFinalFilmQueue = () => {
  if (!finalFilmQueue) {
    const connection = ensureProducerConnection();
    finalFilmQueue = new Queue(FINAL_FILM_QUEUE, {
      ...queueOptions(connection),
      defaultJobOptions: {
        removeOnComplete: 200,
        removeOnFail: 500,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      },
    });
  }
  return finalFilmQueue;
};

export const getBullMqQueues = (): BullMqQueueHandle[] => {
  if (queueBackend !== 'bullmq') return [];
  return [getStoryboardImageQueue(), getSceneQueue(), getFinalFilmQueue()];
};

export const getQueueBackend = () => queueBackend;
export const queueWorkersConfigured = () => queueBackend === 'bullmq';

export const enqueueSceneVideoQueueRun = async (jobId: string) => {
  if (queueBackend !== 'bullmq') return;
  const queue = getSceneQueue();
  await queue.add('drain-scene-video', { jobId, enqueuedAt: Date.now() }, {
    jobId: buildQueueRunJobId('scene-video', jobId),
  });
};

export const enqueueStoryboardImageQueueRun = async (jobId: string) => {
  if (queueBackend !== 'bullmq') return;
  const queue = getStoryboardImageQueue();
  await queue.add('drain-storyboard-image', { jobId, enqueuedAt: Date.now() }, {
    jobId: buildQueueRunJobId('storyboard-image', jobId),
  });
};

export const enqueueFinalFilmQueueRun = async (jobId: string) => {
  if (queueBackend !== 'bullmq') return;
  const queue = getFinalFilmQueue();
  await queue.add('drain-final-film', { jobId, enqueuedAt: Date.now() }, {
    jobId: buildQueueRunJobId('final-film', jobId),
  });
};

export const startQueueWorkers = (args: StartQueueWorkersArgs) => {
  if (queueBackend !== 'bullmq') throw new Error('startQueueWorkers called while queue backend is not bullmq');

  const workerSceneConnection = ensureConsumerConnection().duplicate();
  const workerStoryboardImageConnection = ensureConsumerConnection().duplicate();
  const workerFinalFilmConnection = ensureConsumerConnection().duplicate();
  const log = (message: string) => args.onLog?.(message);
  workerStoryboardImageConnection.on('error', error => {
    const message = error instanceof Error ? error.message : 'unknown error';
    log(`[queue] BullMQ storyboard image worker connection error: ${message}`);
  });
  workerSceneConnection.on('error', error => {
    const message = error instanceof Error ? error.message : 'unknown error';
    log(`[queue] BullMQ scene worker connection error: ${message}`);
  });
  workerFinalFilmConnection.on('error', error => {
    const message = error instanceof Error ? error.message : 'unknown error';
    log(`[queue] BullMQ final film worker connection error: ${message}`);
  });

  const storyboardImageWorker = new Worker(
    STORYBOARD_IMAGE_QUEUE,
    async job => {
      await args.processStoryboardImageQueue(String(job?.data?.jobId || ''));
    },
    {
      ...queueOptions(workerStoryboardImageConnection),
      concurrency: QUEUE_CONCURRENCY,
    }
  );

  const sceneWorker = new Worker(
    SCENE_VIDEO_QUEUE,
    async job => {
      await args.processSceneVideoQueue(String(job?.data?.jobId || ''));
    },
    {
      ...queueOptions(workerSceneConnection),
      concurrency: QUEUE_CONCURRENCY,
    }
  );

  const finalFilmWorker = new Worker(
    FINAL_FILM_QUEUE,
    async job => {
      await args.processFinalFilmQueue(String(job?.data?.jobId || ''));
    },
    {
      ...queueOptions(workerFinalFilmConnection),
      concurrency: QUEUE_CONCURRENCY,
    }
  );

  storyboardImageWorker.on('ready', () => log?.('[queue] BullMQ storyboard-image worker ready'));
  sceneWorker.on('ready', () => log?.('[queue] BullMQ scene-video worker ready'));
  finalFilmWorker.on('ready', () => log?.('[queue] BullMQ final-film worker ready'));
  storyboardImageWorker.on('error', error => log?.(`[queue] BullMQ storyboard-image worker error: ${error instanceof Error ? error.message : 'unknown error'}`));
  sceneWorker.on('error', error => log?.(`[queue] BullMQ scene-video worker error: ${error instanceof Error ? error.message : 'unknown error'}`));
  finalFilmWorker.on('error', error => log?.(`[queue] BullMQ final-film worker error: ${error instanceof Error ? error.message : 'unknown error'}`));

  const close = async () => {
    await storyboardImageWorker.close();
    await sceneWorker.close();
    await finalFilmWorker.close();
    await workerStoryboardImageConnection.quit();
    await workerSceneConnection.quit();
    await workerFinalFilmConnection.quit();
  };

  return { close };
};

const buildQueueSnapshot = async (queue: Queue<{ jobId: string; enqueuedAt: number }>): Promise<QueueSnapshot> => {
  const countsRaw = await queue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed', 'paused');
  const failedJobs = await queue.getJobs(['failed'], 0, 9, false);
  return {
    name: queue.name,
    counts: {
      waiting: Number(countsRaw.waiting || 0),
      active: Number(countsRaw.active || 0),
      completed: Number(countsRaw.completed || 0),
      failed: Number(countsRaw.failed || 0),
      delayed: Number(countsRaw.delayed || 0),
      paused: Number(countsRaw.paused || 0),
    },
    recentFailed: failedJobs.map(job => ({
      id: String(job.id || ''),
      name: String(job.name || ''),
      failedReason: String(job.failedReason || ''),
      timestamp: Number(job.timestamp || 0),
    })),
  };
};

export const getQueueDashboardData = async (): Promise<QueueDashboardData> => {
  if (queueBackend !== 'bullmq') {
    return {
      backend: queueBackend,
      timestamp: Date.now(),
      queues: [],
    };
  }

  const [storyboardImage, scene, finalFilm] = await Promise.all([
    buildQueueSnapshot(getStoryboardImageQueue()),
    buildQueueSnapshot(getSceneQueue()),
    buildQueueSnapshot(getFinalFilmQueue()),
  ]);

  return {
    backend: queueBackend,
    timestamp: Date.now(),
    queues: [storyboardImage, scene, finalFilm],
  };
};
