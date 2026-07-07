// Centralized query keys. Queries key on [name, userId]; invalidations use the
// bare [name] prefix so they match regardless of which user is cached.
export const qk = {
  meals: (userId: string | undefined) => ["meals", userId] as const,
  routines: (userId: string | undefined) => ["routines", userId] as const,
  progress: (userId: string | undefined) => ["progress", userId] as const,
  profile: (userId: string | undefined) => ["profile", userId] as const,
  // Read-only coaching data. The coach is shared across clients, so its key
  // carries no userId; membership is per-client.
  coach: () => ["coach"] as const,
  membership: (userId: string | undefined) => ["membership", userId] as const,
};

export const qkPrefixes = [
  ["meals"],
  ["routines"],
  ["progress"],
  ["profile"],
] as const;
