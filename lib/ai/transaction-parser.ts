import type { CategoryRow } from "@/lib/database/schema";
import { transactionInput, type TransactionInput, type TransactionParseInput } from "@/lib/validation/schemas";

interface ParsedTransactionEnvelope {
  transactions: TransactionInput[];
}

export interface TransactionParseResult extends ParsedTransactionEnvelope {
  source: "openai" | "local";
  warning?: string;
}

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

const amountPattern =
  /(?:\$+\s*)?(\d+(?:\.\d{1,2})?)\s*(?:dollars?|bucks?|cad)?|(?:dollars?|bucks?)\s*(\d+(?:\.\d{1,2})?)/i;

function toCents(value: string): number {
  return Math.round(Number.parseFloat(value) * 100);
}

function normalizeDescription(value: string): string {
  return value
    .replace(/[.!?]+$/g, "")
    .replace(/^(?:a|an|the)\s+/i, "")
    .trim();
}

function pickCategoryId(description: string, categories: CategoryRow[]): string | null {
  const q = description.toLowerCase();
  const category = categories.find((c) => {
    const name = c.name.toLowerCase();
    if (c.type === "income") return false;
    if (q.includes(name)) return true;
    if (name === "restaurants" && /\b(tim hortons|coffee|restaurant|lunch|dinner|breakfast|cafe)\b/.test(q)) return true;
    if (name === "groceries" && /\b(grocery|groceries|redbull|snack|food)\b/.test(q)) return true;
    return false;
  });
  return category?.id ?? null;
}

export function parseTransactionsLocally(
  input: TransactionParseInput,
  categories: CategoryRow[]
): TransactionInput[] {
  const segments = input.text
    .split(/\s+(?:and|then|plus)\s+|,/i)
    .map((part) => part.trim())
    .filter(Boolean);

  return segments.flatMap((segment) => {
    const match = segment.match(amountPattern);
    const amountText = match?.[1] ?? match?.[2];
    if (!match || !amountText) return [];

    const afterAmount = segment.slice(match.index! + match[0].length);
    const merchantMatch = afterAmount.match(/\b(?:on|at|from|for)\s+(.+)$/i) ?? segment.match(/\b(?:on|at|from|for)\s+(.+)$/i);
    const description = normalizeDescription(merchantMatch?.[1] ?? segment.replace(match[0], ""));
    if (!description) return [];

    return [
      {
        date: input.date,
        description,
        amount: toCents(amountText),
        type: "expense",
        paymentMethod: input.paymentMethod,
        categoryId: pickCategoryId(description, categories),
        notes: `Parsed from dictation: "${input.text}"`,
      },
    ];
  });
}

function parseOpenAIContent(raw: unknown): ParsedTransactionEnvelope {
  const content =
    typeof raw === "object" && raw !== null
      ? (raw as { choices?: Array<{ message?: { content?: unknown } }> }).choices?.[0]?.message?.content
      : null;
  if (typeof content !== "string") throw new Error("OpenAI response did not include JSON content");

  const parsed = JSON.parse(content) as unknown;
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !Array.isArray((parsed as ParsedTransactionEnvelope).transactions)
  ) {
    throw new Error("OpenAI response was not a transaction list");
  }

  return {
    transactions: (parsed as ParsedTransactionEnvelope).transactions.map((transaction) =>
      transactionInput.parse(transaction)
    ),
  };
}

export async function parseTransactionsWithAI(
  input: TransactionParseInput,
  categories: CategoryRow[]
): Promise<TransactionParseResult> {
  const localTransactions = parseTransactionsLocally(input, categories);
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      transactions: localTransactions,
      source: "local",
      warning: "Set OPENAI_API_KEY to use the LLM parser.",
    };
  }

  const categoryList = categories.map((c) => ({
    id: c.id,
    name: c.name,
    type: c.type,
    ...(c.icon ? { icon: c.icon } : {}),
  }));

  const categoryIds = categoryList.map((c) => c.id);

  const response = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Extract personal finance transactions from dictated text. Return only valid JSON. Use cents for amount. Split multiple purchases into separate transactions. Prefer expense unless the user clearly describes income, a refund, a transfer, a bill payment, or savings. Write the description in Title Case (e.g. 'Tim Hortons Coffee', 'Uber Eats', 'Netflix Subscription'). You MUST set categoryId to the most semantically appropriate id from the provided categories list — read the transaction description and match it to the best category by name and type. Only use null if no category is even remotely relevant.",
        },
        {
          role: "user",
          content: JSON.stringify({
            text: input.text,
            defaultDate: input.date,
            defaultPaymentMethod: input.paymentMethod,
            categories: categoryList,
            schema: {
              transactions: [
                {
                  date: "YYYY-MM-DD",
                  description: "merchant or item in Title Case",
                  amount: "integer cents",
                  type: "expense|income|refund|transfer|bill_payment|savings",
                  paymentMethod: "debit|credit|cash|bank_transfer|other",
                  categoryId: "one of the category ids above, or null",
                  notes: "short provenance note or null",
                },
              ],
            },
          }),
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "transaction_parse",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["transactions"],
            properties: {
              transactions: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["date", "description", "amount", "type", "paymentMethod", "categoryId", "notes"],
                  properties: {
                    date: { type: "string" },
                    description: { type: "string" },
                    amount: { type: "integer" },
                    type: {
                      type: "string",
                      enum: ["expense", "income", "refund", "transfer", "bill_payment", "savings"],
                    },
                    paymentMethod: {
                      type: "string",
                      enum: ["debit", "credit", "cash", "bank_transfer", "other"],
                    },
                    categoryId: {
                      anyOf: [
                        ...(categoryIds.length > 0 ? [{ type: "string" as const, enum: categoryIds }] : [{ type: "string" as const }]),
                        { type: "null" as const },
                      ],
                    },
                    notes: { anyOf: [{ type: "string" }, { type: "null" }] },
                  },
                },
              },
            },
          },
        },
      },
    }),
  });

  if (!response.ok) {
    const fallbackWarning = `OpenAI parser failed (${response.status}); used local parsing instead.`;
    return { transactions: localTransactions, source: "local", warning: fallbackWarning };
  }

  return { ...parseOpenAIContent(await response.json()), source: "openai" };
}
