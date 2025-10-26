// Generic Result type used across layers
// Success case merges payload fields; failure carries an error message.
export type Result<T = Record<string, unknown>, E = string> =
  | ({ success: true } & T)
  | { success: false; error: E }

export type Success<T = Record<string, unknown>> = { success: true } & T
export type Failure<E = string> = { success: false; error: E }
