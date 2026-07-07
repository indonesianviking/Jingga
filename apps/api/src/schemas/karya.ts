import { z } from 'zod';

export const createKaryaSchema = z.object({
  judul: z.string().min(3, 'Title must be at least 3 characters').max(200),
  deskripsi: z.string().min(10, 'Description must be at least 10 characters').max(2000),
  kategori: z.enum(['fiksi', 'paper', 'puisi', 'non-fiksi']),
  harga: z.number().min(0.1, 'Price must be at least 0.1 XLM').max(10000),
  tags: z.array(z.string().max(30)).max(5).optional(),
  collaborators: z.array(z.object({
    wallet_address: z.string().startsWith('G', 'Invalid Stellar wallet address'),
    nama: z.string().max(100).optional(),
    role: z.enum(['penulis', 'editor', 'ilustrator', 'kolaborator']),
    persentase: z.number().min(0.01).max(100),
  })).optional(),
});

export const updateKaryaSchema = z.object({
  judul: z.string().min(3).max(200).optional(),
  deskripsi: z.string().min(10).max(2000).optional(),
  harga: z.number().min(0.1).max(10000).optional(),
});

export const publishKaryaSchema = z.object({
  confirmOriginal: z.literal(true, {
    errorMap: () => ({ message: 'You must confirm this is your original work' }),
  }),
  confirmTerms: z.literal(true, {
    errorMap: () => ({ message: 'You must accept the terms' }),
  }),
});

export type CreateKaryaInput = z.infer<typeof createKaryaSchema>;
export type UpdateKaryaInput = z.infer<typeof updateKaryaSchema>;
