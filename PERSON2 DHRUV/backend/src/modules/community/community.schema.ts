import { z } from 'zod';

export const createPostSchema = z
  .object({
    type: z.enum(['JOB', 'SERVICE']).optional(),
    title: z.string().trim().min(2).max(200),
    description: z.string().trim().min(3).max(5000),
    budget: z.union([z.number(), z.string()]).optional(),
    budgetMin: z.union([z.number(), z.string()]).optional(),
    budgetMax: z.union([z.number(), z.string()]).optional(),
    tags: z.union([z.array(z.string()), z.string()]).optional(),
    skills: z.union([z.array(z.string()), z.string()]).optional(),
    timeline: z.string().optional(),
    experienceLevel: z.string().optional(),
    availability: z.string().optional(),
    portfolioLink: z.string().optional(),
  })
  .transform((data) => {
    let parsedBudget: number | undefined;
    const rawBudget = data.budget ?? data.budgetMax ?? data.budgetMin;
    if (typeof rawBudget === 'number') {
      parsedBudget = rawBudget;
    } else if (typeof rawBudget === 'string') {
      const match = rawBudget.match(/[\d.]+/);
      if (match) {
        parsedBudget = parseFloat(match[0]);
      }
    }

    let tagsList: string[] = [];
    const rawTags = data.tags || data.skills;
    if (Array.isArray(rawTags)) {
      tagsList = rawTags;
    } else if (typeof rawTags === 'string') {
      tagsList = rawTags.split(',').map((t) => t.trim()).filter(Boolean);
    }

    return {
      type: data.type || 'JOB',
      title: data.title,
      description: data.description,
      budget: parsedBudget && !isNaN(parsedBudget) ? parsedBudget : 1.0,
      tags: tagsList,
    };
  });

export const searchPostQuerySchema = z.object({
  type: z.enum(['JOB', 'SERVICE']).optional(),
  status: z.string().optional(),
  tag: z.string().optional(),
  query: z.string().optional(),
});

export const submitProposalSchema = z
  .object({
    coverLetter: z.string().trim().min(3).max(4000).optional(),
    message: z.string().trim().min(3).max(4000).optional(),
    proposedBudget: z.union([z.number(), z.string()]).optional(),
    price: z.union([z.number(), z.string()]).optional(),
    proposedDuration: z.string().trim().min(1).max(100).optional(),
  })
  .transform((data) => {
    let budget = 1.0;
    const rawPrice = data.proposedBudget ?? data.price;
    if (typeof rawPrice === 'number') {
      budget = rawPrice;
    } else if (typeof rawPrice === 'string') {
      const match = rawPrice.match(/[\d.]+/);
      if (match) budget = parseFloat(match[0]);
    }

    return {
      coverLetter: data.coverLetter || data.message || 'I am interested in this project.',
      proposedBudget: budget && !isNaN(budget) ? budget : 1.0,
      proposedDuration: data.proposedDuration || '7 days',
    };
  });

export const createThreadSchema = z.object({
  postId: z.string().optional(),
  recipientId: z.string().min(1),
  subject: z.string().trim().min(2).max(200),
});

export const sendMessageSchema = z
  .object({
    content: z.string().trim().min(1).max(5000).optional(),
    text: z.string().trim().min(1).max(5000).optional(),
  })
  .transform((data) => ({
    content: data.content || data.text || '',
  }))
  .refine((data) => data.content.length > 0, {
    message: 'Message content cannot be empty',
  });
