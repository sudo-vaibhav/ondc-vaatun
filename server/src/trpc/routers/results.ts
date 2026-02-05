import { z } from "zod";
import { getConfirmResult } from "../../lib/confirm-store";
import { getInitResult } from "../../lib/init-store";
import { getSearchResults } from "../../lib/search-store";
import { getSelectResult } from "../../lib/select-store";
import { getStatusResult } from "../../lib/status-store";
import { publicProcedure, router } from "../trpc";

export const resultsRouter = router({
  getSearchResults: publicProcedure
    .input(
      z.object({
        transactionId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { kv } = ctx;

      const results = await getSearchResults(kv, input.transactionId);

      if (!results) {
        return {
          found: false,
          transactionId: input.transactionId,
          responseCount: 0,
          providers: [],
          responses: [],
          message: "No search entry found for this transaction ID",
        };
      }

      return results;
    }),

  getSelectResults: publicProcedure
    .input(
      z.object({
        transactionId: z.string(),
        messageId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { kv } = ctx;

      const result = await getSelectResult(
        kv,
        input.transactionId,
        input.messageId,
      );

      if (!result.found) {
        return {
          found: false,
          transactionId: input.transactionId,
          messageId: input.messageId,
          hasResponse: false,
          message: "No select entry found for this transaction",
        };
      }

      return result;
    }),

  getInitResults: publicProcedure
    .input(
      z.object({
        transactionId: z.string(),
        messageId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { kv } = ctx;

      const result = await getInitResult(
        kv,
        input.transactionId,
        input.messageId,
      );

      if (!result.found) {
        return {
          found: false,
          transactionId: input.transactionId,
          messageId: input.messageId,
          hasResponse: false,
          message: "No init entry found for this transaction",
        };
      }

      return result;
    }),

  getConfirmResults: publicProcedure
    .input(
      z.object({
        transactionId: z.string(),
        messageId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { kv } = ctx;

      const result = await getConfirmResult(
        kv,
        input.transactionId,
        input.messageId,
      );

      if (!result.found) {
        return {
          found: false,
          transactionId: input.transactionId,
          messageId: input.messageId,
          hasResponse: false,
          message: "No confirm entry found for this transaction",
        };
      }

      return result;
    }),

  getStatusResults: publicProcedure
    .input(
      z.object({
        orderId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { kv } = ctx;

      const result = await getStatusResult(kv, input.orderId);

      if (!result.found) {
        return {
          found: false,
          orderId: input.orderId,
          transactionId: "",
          hasResponse: false,
          message: "No status entry found for this order",
        };
      }

      return result;
    }),
});
