const { describe, test } = require("node:test");
const assert = require("node:assert");

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL =
    "postgresql://test:test@127.0.0.1:65432/autodriv_test_unreachable";
}
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = "01234567890123456789012345678901";
}
process.env.NODE_ENV = process.env.NODE_ENV || "development";

const {
  getOperationsDashboard
} = require("../src/modules/dashboard/operationsDashboard.service");

describe("operations dashboard contract", () => {
  test("compõe ações inteligentes, inbox e pipeline em uma resposta de tela", async () => {
    const result = await getOperationsDashboard(
      { id: 10, dealership_id: 7 },
      {
        async getTodayIntelligence() {
          return {
            summary: { critical_actions: 2 },
            actions: [{ id: 1, type: "inbox_reply" }]
          };
        },
        async listConversations() {
          return [
            {
              id: 9,
              unread_count: 3,
              assigned_user_id: null,
              sla_due_at: new Date(Date.now() - 1000).toISOString()
            }
          ];
        },
        async getPipeline() {
          return {
            totals: { open_leads: 4, overdue_sla: 1 },
            stages: [
              { id: 1, key: "new", name: "Novo", leads: [{ id: 11 }] }
            ]
          };
        }
      }
    );

    assert.strictEqual(result.screen.title, "Cockpit do lojista");
    assert.strictEqual(result.intelligence.actions.length, 1);
    assert.strictEqual(result.inbox.summary.unread, 3);
    assert.strictEqual(result.inbox.summary.unassigned, 1);
    assert.strictEqual(result.pipeline.summary.open_leads, 4);
    assert.ok(
      result.summary_cards.some(
        (card) => card.key === "sla_overdue" && card.value >= 2
      )
    );
  });

  test("degrada para dados parciais quando modulos operacionais ainda nao existem", async () => {
    const result = await getOperationsDashboard(
      { id: 10, dealership_id: 7 },
      {
        async getTodayIntelligence() {
          throw new Error("relation intelligence_actions does not exist");
        },
        async listConversations() {
          throw new Error("relation inbox_threads does not exist");
        },
        async getPipeline() {
          throw new Error("relation pipeline_stages does not exist");
        }
      }
    );

    assert.strictEqual(result.status, "partial");
    assert.strictEqual(result.section_errors.length, 3);
    assert.deepStrictEqual(result.intelligence.actions, []);
    assert.deepStrictEqual(result.inbox.conversations, []);
    assert.deepStrictEqual(result.pipeline.stages, []);
    assert.strictEqual(result.pipeline.summary.open_leads, 0);
  });
});
