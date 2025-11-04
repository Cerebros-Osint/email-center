// Instrumentation file to handle build-time vs runtime behavior
export async function register() {
  // Only run instrumentation in runtime, not during build
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const isBuildPhase = 
      process.env.NEXT_PHASE === 'phase-production-build' ||
      process.env.BUILD_ID ||
      process.env.CI === 'true';
    
    if (!isBuildPhase) {
      // Initialize connections only at runtime
      console.log('[Instrumentation] Runtime initialization');
    } else {
      console.log('[Instrumentation] Build phase - skipping connections');
    }
  }
}
