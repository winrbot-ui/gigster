export const MARKETER_TIERS = {
  tier10k: { count: 20, reward: "$10,000 bonus" },
  tier20k: { count: 40, reward: "$20,000 bonus" },
  salary: { count: 40, reward: "$5,000/month salary", field: "salary_active" as const },
} as const;
