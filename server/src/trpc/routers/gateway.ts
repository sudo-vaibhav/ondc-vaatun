import { SpanKind, SpanStatusCode, trace } from "@opentelemetry/api";
import { v7 as uuidv7 } from "uuid";
import { z } from "zod";
import {
  addConfirmResponse,
  createConfirmEntry,
  getConfirmEntry,
} from "../../lib/confirm-store";
import {
  addInitResponse,
  createInitEntry,
  getInitEntry,
} from "../../lib/init-store";
import { logger } from "../../lib/logger";
import { createSearchPayload } from "../../lib/ondc/payload";
import {
  addSearchResponse,
  createSearchEntry,
  getSearchEntry,
} from "../../lib/search-store";
import {
  addSelectResponse,
  createSelectEntry,
  getSelectEntry,
} from "../../lib/select-store";
import {
  addStatusResponse,
  createStatusEntry,
  getStatusEntry,
} from "../../lib/status-store";
import {
  createLinkedSpanOptions,
  restoreTraceContext,
  serializeTraceContext,
} from "../../lib/trace-context-store";
import { publicProcedure, router } from "../trpc";

const tracer = trace.getTracer("ondc-bap", "0.1.0");

export const gatewayRouter = router({
  search: publicProcedure
    .input(
      z.object({
        categoryCode: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { tenant, ondcClient, kv } = ctx;

      return tracer.startActiveSpan("ondc.search", async (span) => {
        try {
          const transactionId = uuidv7();
          const messageId = uuidv7();

          // ONDC-specific attributes (CONTEXT.md decision 2: full ONDC set)
          span.setAttribute("ondc.transaction_id", transactionId);
          span.setAttribute("ondc.message_id", messageId);
          span.setAttribute("ondc.action", "search");
          span.setAttribute("ondc.domain", tenant.domainCode);
          span.setAttribute("ondc.subscriber_id", tenant.subscriberId);

          // Serialize trace context for callback correlation
          const traceparent = serializeTraceContext();

          await createSearchEntry(
            kv,
            transactionId,
            messageId,
            input.categoryCode,
            undefined,
            traceparent,
          );

          const payload = createSearchPayload(
            tenant,
            transactionId,
            messageId,
            input.categoryCode,
          );
          const gatewayUrl = new URL("search", tenant.gatewayUrl);

          logger.info(
            { action: "search", url: gatewayUrl.toString() },
            "Sending ONDC request",
          );
          logger.debug({ payload }, "Search payload");

          // ondcClient.send() creates its own child span (ondc.http.request from 02-03)
          const response = await ondcClient.send<Record<string, unknown>>(
            gatewayUrl,
            "POST",
            payload,
          );

          logger.debug({ response }, "ONDC response received");

          span.setStatus({ code: SpanStatusCode.OK });
          return {
            ...response,
            transactionId,
            messageId,
          };
        } catch (error) {
          span.setAttribute("error.source", "bap");
          span.setAttribute("error.message", (error as Error).message);
          span.recordException(error as Error);
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: (error as Error).message,
          });
          throw error;
        } finally {
          span.end();
        }
      });
    }),

  // DEPRECATED: onSearch callback tracing moved to ondc-compat.ts — BPPs hit /api/ondc/on_search not tRPC
  // onSearch procedure commented out — see git history for original implementation

  select: publicProcedure
    .input(
      z.object({
        transactionId: z.uuid(),
        bppId: z.string(),
        bppUri: z.url(),
        providerId: z.string(),
        itemId: z.string(),
        parentItemId: z.string(),
        xinputFormId: z.string().optional(),
        xinputSubmissionId: z.string().optional(),
        addOns: z
          .array(
            z.object({
              id: z.string(),
              quantity: z.number().int().positive(),
            }),
          )
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { tenant, ondcClient, kv } = ctx;

      return tracer.startActiveSpan("ondc.select", async (span) => {
        try {
          const messageId = uuidv7();

          // ONDC-specific attributes
          span.setAttribute("ondc.transaction_id", input.transactionId);
          span.setAttribute("ondc.message_id", messageId);
          span.setAttribute("ondc.action", "select");
          span.setAttribute("ondc.domain", tenant.domainCode);
          span.setAttribute("ondc.subscriber_id", tenant.subscriberId);
          span.setAttribute("ondc.bpp_id", input.bppId);
          span.setAttribute("ondc.bpp_uri", input.bppUri);

          // Serialize trace context for callback correlation
          const traceparent = serializeTraceContext();

          const items: Array<{
            id: string;
            parent_item_id: string;
            add_ons?: Array<{
              id: string;
              quantity?: { selected?: { count: number } };
            }>;
            xinput?: {
              form?: { id?: string };
              form_response?: { submission_id: string; status: string };
            };
          }> = [
            {
              id: input.itemId,
              parent_item_id: input.parentItemId || input.itemId,
            },
          ];

          if (input.xinputFormId && input.xinputSubmissionId) {
            items[0].xinput = {
              form: { id: input.xinputFormId },
              form_response: {
                submission_id: input.xinputSubmissionId,
                status: "APPROVED",
              },
            };
          }

          if (input.addOns && input.addOns.length > 0) {
            items[0].add_ons = input.addOns.map((addon) => ({
              id: addon.id,
              quantity: { selected: { count: addon.quantity } },
            }));
          }

          const payload = {
            context: {
              action: "select",
              bap_id: tenant.subscriberId,
              bap_uri: `https://${tenant.subscriberId}/api/ondc`,
              bpp_id: input.bppId,
              bpp_uri: input.bppUri,
              domain: tenant.domainCode,
              location: {
                country: { code: "IND" },
                city: { code: "*" },
              },
              transaction_id: input.transactionId,
              message_id: messageId,
              timestamp: new Date().toISOString(),
              ttl: "PT30S",
              version: "2.0.0",
            },
            message: {
              order: {
                provider: { id: input.providerId },
                items: items,
              },
            },
          };

          const selectUrl = input.bppUri.endsWith("/")
            ? `${input.bppUri}select`
            : `${input.bppUri}/select`;

          await createSelectEntry(
            kv,
            input.transactionId,
            messageId,
            input.itemId,
            input.providerId,
            input.bppId,
            input.bppUri,
            traceparent,
          );

          logger.info(
            { action: "select", url: selectUrl },
            "Sending ONDC request",
          );
          logger.debug({ payload }, "Select payload");

          const response = await ondcClient.send<Record<string, unknown>>(
            selectUrl,
            "POST",
            payload,
          );

          logger.debug({ response }, "ONDC response received");

          span.setStatus({ code: SpanStatusCode.OK });
          return {
            ...response,
            transactionId: input.transactionId,
            messageId,
          };
        } catch (error) {
          span.setAttribute("error.source", "bap");
          span.setAttribute("error.message", (error as Error).message);
          span.recordException(error as Error);
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: (error as Error).message,
          });
          throw error;
        } finally {
          span.end();
        }
      });
    }),

  // DEPRECATED: onSelect callback tracing moved to ondc-compat.ts — BPPs hit /api/ondc/on_select not tRPC

  init: publicProcedure
    .input(
      z.object({
        transactionId: z.uuid(),
        bppId: z.string(),
        bppUri: z.url(),
        providerId: z.string(),
        itemId: z.string(),
        parentItemId: z.string(),
        xinputFormId: z.string(),
        submissionId: z.string(),
        addOns: z
          .array(
            z.object({
              id: z.string(),
              quantity: z.number().int().positive(),
            }),
          )
          .optional(),
        customerName: z.string(),
        customerEmail: z.string().email(),
        customerPhone: z.string(),
        amount: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { tenant, ondcClient, kv } = ctx;

      return tracer.startActiveSpan("ondc.init", async (span) => {
        try {
          const messageId = uuidv7();

          // ONDC-specific attributes
          span.setAttribute("ondc.transaction_id", input.transactionId);
          span.setAttribute("ondc.message_id", messageId);
          span.setAttribute("ondc.action", "init");
          span.setAttribute("ondc.domain", tenant.domainCode);
          span.setAttribute("ondc.bpp_id", input.bppId);
          span.setAttribute("ondc.bpp_uri", input.bppUri);

          // Serialize trace context for callback correlation
          const traceparent = serializeTraceContext();

          await createInitEntry(
            kv,
            input.transactionId,
            messageId,
            input.itemId,
            input.providerId,
            input.bppId,
            input.bppUri,
            traceparent,
          );

          const items: Array<{
            id: string;
            parent_item_id: string;
            add_ons?: Array<{
              id: string;
              quantity?: { selected?: { count: number } };
            }>;
            xinput: {
              form: { id: string };
              form_response: { submission_id: string; status: string };
            };
          }> = [
            {
              id: input.itemId,
              parent_item_id: input.parentItemId,
              xinput: {
                form: { id: input.xinputFormId },
                form_response: {
                  submission_id: input.submissionId,
                  status: "SUCCESS",
                },
              },
            },
          ];

          if (input.addOns && input.addOns.length > 0) {
            items[0].add_ons = input.addOns.map((addon) => ({
              id: addon.id,
              quantity: { selected: { count: addon.quantity } },
            }));
          }

          const payload = {
            context: {
              action: "init",
              bap_id: tenant.subscriberId,
              bap_uri: `https://${tenant.subscriberId}/api/ondc`,
              bpp_id: input.bppId,
              bpp_uri: input.bppUri,
              domain: tenant.domainCode,
              location: {
                country: { code: "IND" },
                city: { code: "*" },
              },
              transaction_id: input.transactionId,
              message_id: messageId,
              timestamp: new Date().toISOString(),
              ttl: "P24H",
              version: "2.0.0",
            },
            message: {
              order: {
                provider: { id: input.providerId },
                items: items,
                fulfillments: [
                  {
                    customer: {
                      person: { name: input.customerName },
                      contact: {
                        email: input.customerEmail,
                        phone: `+91-${input.customerPhone}`,
                      },
                    },
                  },
                ],
                payments: [
                  {
                    collected_by: "BPP",
                    status: "NOT-PAID",
                    type: "PRE-FULFILLMENT",
                    params: {
                      amount: input.amount,
                      currency: "INR",
                    },
                  },
                ],
              },
            },
          };

          const initUrl = input.bppUri.endsWith("/")
            ? `${input.bppUri}init`
            : `${input.bppUri}/init`;

          logger.info({ action: "init", url: initUrl }, "Sending ONDC request");
          logger.debug({ payload }, "Init payload");

          const response = await ondcClient.send<Record<string, unknown>>(
            initUrl,
            "POST",
            payload,
          );

          logger.debug({ response }, "ONDC response received");

          span.setStatus({ code: SpanStatusCode.OK });
          return {
            ...response,
            transactionId: input.transactionId,
            messageId,
          };
        } catch (error) {
          span.setAttribute("error.source", "bap");
          span.setAttribute("error.message", (error as Error).message);
          span.recordException(error as Error);
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: (error as Error).message,
          });
          throw error;
        } finally {
          span.end();
        }
      });
    }),

  // DEPRECATED: onInit callback tracing moved to ondc-compat.ts — BPPs hit /api/ondc/on_init not tRPC

  confirm: publicProcedure
    .input(
      z.object({
        transactionId: z.uuid(),
        messageId: z.uuid().optional(),
        bppId: z.string(),
        bppUri: z.url(),
        providerId: z.string(),
        itemId: z.string(),
        parentItemId: z.string(),
        xinputFormId: z.string(),
        submissionId: z.string(),
        addOns: z
          .array(
            z.object({
              id: z.string(),
              quantity: z.number().int().positive(),
            }),
          )
          .optional(),
        customerName: z.string(),
        customerEmail: z.string().email(),
        customerPhone: z.string(),
        quoteId: z.string(),
        amount: z.string(),
        quoteBreakup: z
          .array(
            z.object({
              title: z.string(),
              price: z.object({
                currency: z.string(),
                value: z.string(),
              }),
            }),
          )
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { tenant, ondcClient, kv } = ctx;

      return tracer.startActiveSpan("ondc.confirm", async (span) => {
        try {
          const messageId = input.messageId || uuidv7();

          // ONDC-specific attributes
          span.setAttribute("ondc.transaction_id", input.transactionId);
          span.setAttribute("ondc.message_id", messageId);
          span.setAttribute("ondc.action", "confirm");
          span.setAttribute("ondc.domain", tenant.domainCode);
          span.setAttribute("ondc.bpp_id", input.bppId);
          span.setAttribute("ondc.bpp_uri", input.bppUri);

          // Serialize trace context for callback correlation
          const traceparent = serializeTraceContext();

          await createConfirmEntry(
            kv,
            input.transactionId,
            messageId,
            input.itemId,
            input.providerId,
            input.bppId,
            input.bppUri,
            input.quoteId,
            input.amount,
            traceparent,
          );

          const items: Array<{
            id: string;
            parent_item_id: string;
            add_ons?: Array<{
              id: string;
              quantity?: { selected?: { count: number } };
            }>;
            xinput: {
              form: { id: string };
              form_response: { submission_id: string; status: string };
            };
          }> = [
            {
              id: input.itemId,
              parent_item_id: input.parentItemId,
              xinput: {
                form: { id: input.xinputFormId },
                form_response: {
                  submission_id: input.submissionId,
                  status: "SUCCESS",
                },
              },
            },
          ];

          if (input.addOns && input.addOns.length > 0) {
            items[0].add_ons = input.addOns.map((addon) => ({
              id: addon.id,
              quantity: { selected: { count: addon.quantity } },
            }));
          }

          const payload = {
            context: {
              action: "confirm",
              bap_id: tenant.subscriberId,
              bap_uri: `https://${tenant.subscriberId}/api/ondc`,
              bpp_id: input.bppId,
              bpp_uri: input.bppUri,
              domain: tenant.domainCode,
              location: {
                country: { code: "IND" },
                city: { code: "*" },
              },
              transaction_id: input.transactionId,
              message_id: messageId,
              timestamp: new Date().toISOString(),
              ttl: "P24H",
              version: "2.0.0",
            },
            message: {
              order: {
                provider: { id: input.providerId },
                items: items,
                fulfillments: [
                  {
                    id: "F1",
                    type: "POLICY",
                    customer: {
                      person: { name: input.customerName },
                      contact: {
                        email: input.customerEmail,
                        phone: `+91-${input.customerPhone}`,
                      },
                    },
                  },
                ],
                payments: [
                  {
                    collected_by: "BPP",
                    status: "NOT-PAID",
                    type: "PRE-FULFILLMENT",
                    params: {
                      amount: input.amount,
                      currency: "INR",
                    },
                  },
                ],
                quote: {
                  id: input.quoteId,
                  price: { currency: "INR", value: input.amount },
                  breakup: input.quoteBreakup,
                  ttl: "P15D",
                },
              },
            },
          };

          const confirmUrl = input.bppUri.endsWith("/")
            ? `${input.bppUri}confirm`
            : `${input.bppUri}/confirm`;

          logger.info(
            { action: "confirm", url: confirmUrl },
            "Sending ONDC request",
          );
          logger.debug({ payload }, "Confirm payload");

          const response = await ondcClient.send<Record<string, unknown>>(
            confirmUrl,
            "POST",
            payload,
          );

          logger.debug({ response }, "ONDC response received");

          span.setStatus({ code: SpanStatusCode.OK });
          return {
            ...response,
            transactionId: input.transactionId,
            messageId,
          };
        } catch (error) {
          span.setAttribute("error.source", "bap");
          span.setAttribute("error.message", (error as Error).message);
          span.recordException(error as Error);
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: (error as Error).message,
          });
          throw error;
        } finally {
          span.end();
        }
      });
    }),

  // DEPRECATED: onConfirm callback tracing moved to ondc-compat.ts — BPPs hit /api/ondc/on_confirm not tRPC

  status: publicProcedure
    .input(
      z.object({
        transactionId: z.uuid(),
        orderId: z.string(),
        bppId: z.string(),
        bppUri: z.url(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { tenant, ondcClient, kv } = ctx;

      return tracer.startActiveSpan("ondc.status", async (span) => {
        try {
          const messageId = uuidv7();

          // ONDC-specific attributes
          span.setAttribute("ondc.transaction_id", input.transactionId);
          span.setAttribute("ondc.message_id", messageId);
          span.setAttribute("ondc.action", "status");
          span.setAttribute("ondc.domain", tenant.domainCode);
          span.setAttribute("ondc.bpp_id", input.bppId);
          span.setAttribute("ondc.bpp_uri", input.bppUri);
          span.setAttribute("ondc.order_id", input.orderId);

          // Serialize trace context for callback correlation
          const traceparent = serializeTraceContext();

          await createStatusEntry(
            kv,
            input.orderId,
            input.transactionId,
            input.bppId,
            input.bppUri,
            traceparent,
          );

          // Status request is much simpler - just order_id in message
          const payload = {
            context: {
              action: "status",
              bap_id: tenant.subscriberId,
              bap_uri: `https://${tenant.subscriberId}/api/ondc`,
              bpp_id: input.bppId,
              bpp_uri: input.bppUri,
              domain: tenant.domainCode,
              location: {
                country: { code: "IND" },
                city: { code: "*" },
              },
              transaction_id: input.transactionId,
              message_id: messageId,
              timestamp: new Date().toISOString(),
              ttl: "PT10M", // Shorter TTL for status
              version: "2.0.0",
            },
            message: {
              order_id: input.orderId,
            },
          };

          const statusUrl = input.bppUri.endsWith("/")
            ? `${input.bppUri}status`
            : `${input.bppUri}/status`;

          logger.info(
            { action: "status", url: statusUrl },
            "Sending ONDC request",
          );
          logger.debug({ payload }, "Status payload");

          const response = await ondcClient.send<Record<string, unknown>>(
            statusUrl,
            "POST",
            payload,
          );

          logger.debug({ response }, "ONDC response received");

          span.setStatus({ code: SpanStatusCode.OK });
          return {
            ...response,
            transactionId: input.transactionId,
            orderId: input.orderId,
            messageId,
          };
        } catch (error) {
          span.setAttribute("error.source", "bap");
          span.setAttribute("error.message", (error as Error).message);
          span.recordException(error as Error);
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: (error as Error).message,
          });
          throw error;
        } finally {
          span.end();
        }
      });
    }),

  // DEPRECATED: onStatus callback tracing moved to ondc-compat.ts — BPPs hit /api/ondc/on_status not tRPC
});
