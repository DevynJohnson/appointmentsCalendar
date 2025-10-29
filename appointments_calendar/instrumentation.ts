// Instrumentation for Sentry - runs when the application starts
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./instrumentation-server');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./instrumentation-edge');
  }
}

// Add request error handler for Sentry
export async function onRequestError(error: unknown, request: { path: string }) {
  // Import Sentry dynamically to avoid issues during build
  const Sentry = await import('@sentry/nextjs');
  
  // Capture request errors with context
  Sentry.captureException(error, {
    tags: {
      component: 'request-handler',
    },
    extra: {
      path: request.path,
    },
  });
}