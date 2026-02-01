import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import { getSearchResults } from "../../lib/search-store";
import { getSelectResult } from "../../lib/select-store";

export const resultsRouter = router({
  getSearchResults: publicProcedure
    .input(
      z.object({
        transactionId: z.string(),
      })
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
      })
    )
    .query(async ({ ctx, input }) => {
      const { kv } = ctx;

      const result = await getSelectResult(
        kv,
        input.transactionId,
        input.messageId
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
});
