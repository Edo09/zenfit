// Centralized query keys. Queries key on [name, userId]; invalidations use the
// bare [name] prefix so they match regardless of which user is cached.
export const qk = {
  meals: (userId: string | undefined) => ["meals", userId] as const,
  routines: (userId: string | undefined) => ["routines", userId] as const,
  progress: (userId: string | undefined) => ["progress", userId] as const,
  profile: (userId: string | undefined) => ["profile", userId] as const,
};

export const qkPrefixes = [
  ["meals"],
  ["routines"],
  ["progress"],
  ["profile"],
] as const;
