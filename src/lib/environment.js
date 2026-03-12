export const ENVIRONMENT_MODE = String(import.meta.env.VITE_ENVIRONMENT_MODE || 'production').toLowerCase();

export const isDevelopmentMode = ENVIRONMENT_MODE === 'development';
export const isStagingMode = ENVIRONMENT_MODE === 'staging';
export const isProductionMode = ENVIRONMENT_MODE === 'production';
