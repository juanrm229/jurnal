export class ApiError extends Error {
  constructor(
    public status: 400 | 401 | 402 | 403 | 404 | 409 | 410 | 413 | 422 | 429 | 500 | 503,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export const bad = (code: string, message: string) => new ApiError(400, code, message);
export const unauthorized = (message = 'Masuk dulu, ya.') => new ApiError(401, 'unauthorized', message);
export const forbidden = (message = 'Ini bukan untukmu.') => new ApiError(403, 'forbidden', message);
export const notFound = (message = 'Tidak ditemukan.') => new ApiError(404, 'not_found', message);
export const conflict = (code: string, message: string) => new ApiError(409, code, message);
export const paymentRequired = (code: string, message: string) => new ApiError(402, code, message);
