export function storageConfig(enabled = false) {
  return {
    provider: "local",
    freePlan: "supabase",
    supabase: {
      enabled,
      projectUrlEnv: "SUPABASE_URL",
      serviceRoleKeyEnv: "SUPABASE_SERVICE_ROLE_KEY",
      bucket: "broadcast-bot-runs",
      tables: {
        coreRuns: "broadcast_core_runs",
        socialRuns: "broadcast_social_runs"
      }
    }
  };
}
