export const queryKeys = {
  takConfig: ["tak", "config"] as const,
  takStatus: ["tak", "status"] as const,
  certs: ["tak", "certs"] as const,
  enablementTypes: ["enablement-types"] as const,
  enablements: ["enablements"] as const,
  enablement: (id: number) => ["enablements", id] as const,
  sources: (enablementId: number) => ["enablements", enablementId, "sources"] as const,
  knownSources: (enablementId: number) => ["enablements", enablementId, "known-sources"] as const,
  packages: ["packages"] as const,
} as const;
