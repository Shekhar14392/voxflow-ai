import { prisma } from "./index";

async function main() {
  const plans = [
    { name: "FREE", priceUsd: 0, maxAgents: 1, maxUsers: 1, maxPhoneNumbers: 0, monthlyVoiceMinutes: 0, monthlyOutboundMinutes: 0, monthlyKnowledgeDocuments: 3, monthlyRagQueries: 100, monthlyApiRequests: 500, maxConcurrentCalls: 0, recordingRetentionDays: 7 },
    { name: "STARTER", priceUsd: 29, maxAgents: 1, maxUsers: 3, maxPhoneNumbers: 1, monthlyVoiceMinutes: 500, monthlyOutboundMinutes: 100, monthlyKnowledgeDocuments: 20, monthlyRagQueries: 2000, monthlyApiRequests: 5000, maxConcurrentCalls: 2, recordingRetentionDays: 30 },
    { name: "PRO", priceUsd: 99, maxAgents: 3, maxUsers: 10, maxPhoneNumbers: 3, monthlyVoiceMinutes: 2000, monthlyOutboundMinutes: 500, monthlyKnowledgeDocuments: 100, monthlyRagQueries: 10000, monthlyApiRequests: 25000, maxConcurrentCalls: 5, recordingRetentionDays: 90 },
    { name: "BUSINESS", priceUsd: 299, maxAgents: 10, maxUsers: 50, maxPhoneNumbers: 10, monthlyVoiceMinutes: 8000, monthlyOutboundMinutes: 2000, monthlyKnowledgeDocuments: 500, monthlyRagQueries: 50000, monthlyApiRequests: 100000, maxConcurrentCalls: 15, recordingRetentionDays: 180 },
  ];

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { name: plan.name },
      update: plan,
      create: plan,
    });
  }

  console.log(`Seeded ${plans.length} plans.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
