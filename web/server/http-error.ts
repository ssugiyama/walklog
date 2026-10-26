export class HttpError extends Error {
  readonly status: 400 | 401 | 403 | 404

  constructor(status: 400 | 401 | 403 | 404, message?: string) {
    super(message)
    this.name = 'HttpError'
    this.status = status
  }
}
