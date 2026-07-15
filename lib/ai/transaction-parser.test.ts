import { describe, expect, it } from "vitest";
import { parseTransactionsLocally } from "./transaction-parser";
import type { CategoryRow } from "@/lib/database/schema";

const categories: CategoryRow[] = [
  {
    id: "restaurants",
    name: "Restaurants",
    type: "expense",
    icon: "utensils",
    isDefault: true,
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "groceries",
    name: "Groceries",
    type: "expense",
    icon: "shopping-cart",
    isDefault: true,
    createdAt: "",
    updatedAt: "",
  },
];

describe("parseTransactionsLocally", () => {
  it("splits dictated spending into transaction drafts", () => {
    expect(
      parseTransactionsLocally(
        {
          text: "i spent 6 bucks on Tim Hortons and 4 dollars on a RedBull",
          date: "2026-07-13",
          paymentMethod: "debit",
        },
        categories
      )
    ).toMatchObject([
      {
        date: "2026-07-13",
        description: "Tim Hortons",
        amount: 600,
        type: "expense",
        paymentMethod: "debit",
        categoryId: "restaurants",
      },
      {
        date: "2026-07-13",
        description: "RedBull",
        amount: 400,
        type: "expense",
        paymentMethod: "debit",
        categoryId: "groceries",
      },
    ]);
  });
});
