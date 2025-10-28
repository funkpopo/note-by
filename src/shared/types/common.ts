// Common shared types used across preload and renderer

export interface AiApiConfig {
  id: string
  name: string
  apiKey: string
  apiUrl: string
  modelName: string
  temperature?: string
  maxTokens?: string
  isThinkingModel?: boolean
}

export interface HistoryItem {
  id: number
  filePath: string
  content: string
  timestamp: number
}

// AI API Error Types and Diagnosis
export enum ApiErrorType {
  // Authentication & Authorization
  INVALID_API_KEY = 'invalidApiKey',
  EXPIRED_API_KEY = 'expiredApiKey',
  UNAUTHORIZED = 'unauthorized',
  FORBIDDEN = 'forbidden',

  // Network & Connection
  NETWORK_ERROR = 'networkError',
  CONNECTION_TIMEOUT = 'connectionTimeout',
  DNS_RESOLUTION_FAILED = 'dnsResolutionFailed',
  SSL_CERTIFICATE_ERROR = 'sslCertificateError',
  CONNECTION_REFUSED = 'connectionRefused',

  // API Rate Limiting & Quotas
  RATE_LIMIT_EXCEEDED = 'rateLimitExceeded',
  QUOTA_EXCEEDED = 'quotaExceeded',
  INSUFFICIENT_BALANCE = 'insufficientBalance',
  DAILY_LIMIT_REACHED = 'dailyLimitReached',

  // Model & Configuration
  MODEL_NOT_FOUND = 'modelNotFound',
  MODEL_NOT_AVAILABLE = 'modelNotAvailable',
  INVALID_MODEL = 'invalidModel',
  UNSUPPORTED_MODEL = 'unsupportedModel',

  // Request Issues
  INVALID_REQUEST = 'invalidRequest',
  MALFORMED_JSON = 'malformedJson',
  CONTENT_TOO_LARGE = 'contentTooLarge',
  INVALID_PARAMETERS = 'invalidParameters',

  // Server Issues
  SERVER_ERROR = 'serverError',
  SERVICE_UNAVAILABLE = 'serviceUnavailable',
  API_MAINTENANCE = 'apiMaintenance',
  GATEWAY_TIMEOUT = 'gatewayTimeout',

  // Generic
  UNKNOWN_ERROR = 'unknownError',
  REQUEST_FAILED = 'requestFailed'
}

export interface ApiErrorDiagnosis {
  type: ApiErrorType
  message: string
  diagnosticInfo: {
    statusCode?: number
    originalError?: string
    url?: string
    model?: string
    timestamp: number
    suggestions?: string[]
  }
}
