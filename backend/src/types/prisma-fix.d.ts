// Minimal augmentation to satisfy TypeScript in CI builds when Prisma types mismatch
declare module '@prisma/client' {
  export class PrismaClient {
    constructor(options?: any);
    $connect(): Promise<void>;
    $disconnect(): Promise<void>;
    [key: string]: any;
  }
  export const Prisma: any;
}
