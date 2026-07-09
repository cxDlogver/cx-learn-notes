import { z } from 'zod';

export const appErrorSchema = z.object({
    code: z.string().min(1),
    message: z.string().min(1),
    details: z.unknown().optional(),
    recoverable: z.boolean().optional()
});

export type AppError = z.infer<typeof appErrorSchema>;

export type Result<T> =
    | {
          ok: true;
          data: T;
      }
    | {
          ok: false;
          error: AppError;
      };

export const createResultSchema = <T extends z.ZodType>(dataSchema: T) =>
    z.discriminatedUnion('ok', [
        z.object({
            ok: z.literal(true),
            data: dataSchema
        }),
        z.object({
            ok: z.literal(false),
            error: appErrorSchema
        })
    ]);

export const createSuccessResult = <T>(data: T): Result<T> => ({
    ok: true,
    data
});

export const createFailureResult = (
    code: string,
    message: string,
    details?: unknown
): Result<never> => {
    const error: AppError = {
        code,
        message
    };

    if (details !== undefined) {
        error.details = details;
    }

    return {
        ok: false,
        error
    };
};
