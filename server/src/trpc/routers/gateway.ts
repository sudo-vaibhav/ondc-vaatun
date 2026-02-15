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
import { addStatusResponse, createStatusEntry } from "../../lib/status-store";
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

          console.log("[Search] Sending request to:", gatewayUrl.toString());
          console.log("[Search] Payload:", JSON.stringify(payload, null, "\t"));

          // ondcClient.send() creates its own child span (ondc.http.request from 02-03)
          const response = await ondcClient.send(gatewayUrl, "POST", payload);

          console.log(
            "[Search] ONDC Response:",
            JSON.stringify(response, null, 2),
          );

          span.setStatus({ code: SpanStatusCode.OK });
          return {
            ...response,
            transactionId,
            messageId,
          };
        } catch (error) {
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

  onSearch: publicProcedure
    .input(
      z.object({
        context: z
          .object({
            transaction_id: z.string().optional(),
            message_id: z.string().optional(),
            bpp_id: z.string().optional(),
            bpp_uri: z.string().optional(),
            timestamp: z.string().optional(),
            ttl: z.string().optional(),
          })
          .passthrough()
          .optional(),
        message: z.any().optional(),
        error: z
          .object({
            type: z.string().optional(),
            code: z.string().optional(),
            message: z.string().optional(),
          })
          .passthrough()
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { kv } = ctx;

      console.log(
        "\n\n[on_search] Request Body:\n\n",
        JSON.stringify(input, null, "\t"),
      );

      const transactionId = input.context?.transaction_id;

      if (!transactionId) {
        console.warn("[on_search] No transaction_id found in context");
        return { message: { ack: { status: "ACK" as const } } };
      }

      // Retrieve stored trace context from search entry
      const entry = await getSearchEntry(kv, transactionId);
      const originalSpanContext = restoreTraceContext(entry?.traceparent);

      if (!entry?.traceparent) {
        console.warn(
          "[on_search] No trace context found for transaction:",
          transactionId,
        );
      }

      // Create callback span with link to original search span
      const spanOptions = createLinkedSpanOptions(originalSpanContext, {
        kind: SpanKind.SERVER,
        attributes: {
          "ondc.transaction_id": transactionId,
          "ondc.action": "on_search",
          "ondc.bpp_id": input.context?.bpp_id || "unknown",
          "ondc.bpp_uri": input.context?.bpp_uri || "unknown",
        },
      });

      return tracer.startActiveSpan("ondc.on_search", spanOptions, async (span) => {
        try {
          await addSearchResponse(
            kv,
            transactionId,
            input as Parameters<typeof addSearchResponse>[2],
          );

          // NACK/error responses from BPP set ERROR status (CONTEXT.md decision 2)
          if (input.error) {
            span.setStatus({
              code: SpanStatusCode.ERROR,
              message: `BPP error: ${input.error.code || "unknown"} - ${input.error.message || "no message"}`,
            });
          } else {
            span.setStatus({ code: SpanStatusCode.OK });
          }

          return { message: { ack: { status: "ACK" as const } } };
        } catch (error) {
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
              version: "2.0.1",
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

          console.log("[Select] Sending request to:", selectUrl);
          console.log("[Select] Payload:", JSON.stringify(payload, null, 2));

          const response = await ondcClient.send(selectUrl, "POST", payload);

          console.log("[Select] ONDC Response:", JSON.stringify(response, null, 2));

          span.setStatus({ code: SpanStatusCode.OK });
          return {
            ...response,
            transactionId: input.transactionId,
            messageId,
          };
        } catch (error) {
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

  onSelect: publicProcedure
    .input(
      z.object({
        context: z
          .object({
            transaction_id: z.string().optional(),
            message_id: z.string().optional(),
            bpp_id: z.string().optional(),
            bpp_uri: z.string().optional(),
          })
          .passthrough()
          .optional(),
        message: z.any().optional(),
        error: z
          .object({
            type: z.string().optional(),
            code: z.string().optional(),
            message: z.string().optional(),
          })
          .passthrough()
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { kv } = ctx;

      console.log(
        "\n\n[on_select] Request Body:\n\n",
        JSON.stringify(input, null, 2),
      );

      const transactionId = input.context?.transaction_id;
      const messageId = input.context?.message_id;

      if (!transactionId || !messageId) {
        console.warn("[on_select] Missing transaction_id or message_id");
        return { message: { ack: { status: "ACK" as const } } };
      }

      // Retrieve stored trace context from select entry
      const entry = await getSelectEntry(kv, transactionId, messageId);
      const originalSpanContext = restoreTraceContext(entry?.traceparent);

      if (!entry?.traceparent) {
        console.warn(
          "[on_select] No trace context found for transaction:",
          transactionId,
        );
      }

      // Create callback span with link to original select span
      const spanOptions = createLinkedSpanOptions(originalSpanContext, {
        kind: SpanKind.SERVER,
        attributes: {
          "ondc.transaction_id": transactionId,
          "ondc.message_id": messageId,
          "ondc.action": "on_select",
          "ondc.bpp_id": input.context?.bpp_id || "unknown",
          "ondc.bpp_uri": input.context?.bpp_uri || "unknown",
        },
      });

      return tracer.startActiveSpan("ondc.on_select", spanOptions, async (span) => {
        try {
          await addSelectResponse(
            kv,
            transactionId,
            messageId,
            input as Parameters<typeof addSelectResponse>[3],
          );

          // NACK/error responses from BPP set ERROR status
          if (input.error) {
            span.setStatus({
              code: SpanStatusCode.ERROR,
              message: `BPP error: ${input.error.code || "unknown"} - ${input.error.message || "no message"}`,
            });
          } else {
            span.setStatus({ code: SpanStatusCode.OK });
          }

          return { message: { ack: { status: "ACK" as const } } };
        } catch (error) {
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
              version: "2.0.1",
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

          console.log("[Init] Sending request to:", initUrl);
          console.log("[Init] Payload:", JSON.stringify(payload, null, 2));

          const response = await ondcClient.send(initUrl, "POST", payload);

          console.log("[Init] ONDC Response:", JSON.stringify(response, null, 2));

          span.setStatus({ code: SpanStatusCode.OK });
          return {
            ...response,
            transactionId: input.transactionId,
            messageId,
          };
        } catch (error) {
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

  onInit: publicProcedure
    .input(
      z.object({
        context: z
          .object({
            transaction_id: z.string().optional(),
            message_id: z.string().optional(),
            bpp_id: z.string().optional(),
            bpp_uri: z.string().optional(),
          })
          .passthrough()
          .optional(),
        message: z.any().optional(),
        error: z
          .object({
            type: z.string().optional(),
            code: z.string().optional(),
            message: z.string().optional(),
          })
          .passthrough()
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { kv } = ctx;

      console.log(
        "\n\n[on_init] Request Body:\n\n",
        JSON.stringify(input, null, "\t"),
      );

      const transactionId = input.context?.transaction_id;
      const messageId = input.context?.message_id;

      if (!transactionId || !messageId) {
        console.warn("[on_init] Missing transaction_id or message_id");
        return { message: { ack: { status: "ACK" as const } } };
      }

      // Retrieve stored trace context from init entry
      const entry = await getInitEntry(kv, transactionId, messageId);
      const originalSpanContext = restoreTraceContext(entry?.traceparent);

      if (!entry?.traceparent) {
        console.warn(
          "[on_init] No trace context found for transaction:",
          transactionId,
        );
      }

      // Create callback span with link to original init span
      const spanOptions = createLinkedSpanOptions(originalSpanContext, {
        kind: SpanKind.SERVER,
        attributes: {
          "ondc.transaction_id": transactionId,
          "ondc.action": "on_init",
          "ondc.bpp_id": input.context?.bpp_id || "unknown",
          "ondc.bpp_uri": input.context?.bpp_uri || "unknown",
        },
      });

      return tracer.startActiveSpan("ondc.on_init", spanOptions, async (span) => {
        try {
          await addInitResponse(
            kv,
            transactionId,
            messageId,
            input as Parameters<typeof addInitResponse>[3],
          );

          // NACK/error responses from BPP set ERROR status
          if (input.error) {
            span.setStatus({
              code: SpanStatusCode.ERROR,
              message: `BPP error: ${input.error.code || "unknown"} - ${input.error.message || "no message"}`,
            });
          } else {
            span.setStatus({ code: SpanStatusCode.OK });
          }

          return { message: { ack: { status: "ACK" as const } } };
        } catch (error) {
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
              version: "2.0.1",
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

          console.log("[Confirm] Sending request to:", confirmUrl);
          console.log("[Confirm] Payload:", JSON.stringify(payload, null, 2));

          const response = await ondcClient.send(confirmUrl, "POST", payload);

          console.log(
            "[Confirm] ONDC Response:",
            JSON.stringify(response, null, 2),
          );

          span.setStatus({ code: SpanStatusCode.OK });
          return {
            ...response,
            transactionId: input.transactionId,
            messageId,
          };
        } catch (error) {
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

  onConfirm: publicProcedure
    .input(
      z.object({
        context: z
          .object({
            transaction_id: z.string().optional(),
            message_id: z.string().optional(),
            bpp_id: z.string().optional(),
            bpp_uri: z.string().optional(),
          })
          .passthrough()
          .optional(),
        message: z.any().optional(),
        error: z
          .object({
            type: z.string().optional(),
            code: z.string().optional(),
            message: z.string().optional(),
          })
          .passthrough()
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { kv } = ctx;

      console.log(
        "\n\n[on_confirm] Request Body:\n\n",
        JSON.stringify(input, null, "\t"),
      );

      const transactionId = input.context?.transaction_id;
      const messageId = input.context?.message_id;
      const orderId = input.message?.order?.id;

      if (!transactionId || !messageId) {
        console.warn("[on_confirm] Missing transaction_id or message_id");
        return { message: { ack: { status: "ACK" as const } } };
      }

      // Retrieve stored trace context from confirm entry
      const entry = await getConfirmEntry(kv, transactionId, messageId);
      const originalSpanContext = restoreTraceContext(entry?.traceparent);

      if (!entry?.traceparent) {
        console.warn(
          "[on_confirm] No trace context found for transaction:",
          transactionId,
        );
      }

      // Create callback span with link to original confirm span
      const spanOptions = createLinkedSpanOptions(originalSpanContext, {
        kind: SpanKind.SERVER,
        attributes: {
          "ondc.transaction_id": transactionId,
          "ondc.action": "on_confirm",
          "ondc.bpp_id": input.context?.bpp_id || "unknown",
          "ondc.bpp_uri": input.context?.bpp_uri || "unknown",
        },
      });

      return tracer.startActiveSpan("ondc.on_confirm", spanOptions, async (span) => {
        try {
          // Extract payment URL and add as span attribute
          const paymentUrl = input.message?.order?.payments?.[0]?.url;
          if (paymentUrl) {
            span.setAttribute("ondc.payment_url", paymentUrl);
          }

          await addConfirmResponse(
            kv,
            transactionId,
            messageId,
            orderId,
            input as Parameters<typeof addConfirmResponse>[4],
          );

          // NACK/error responses from BPP set ERROR status
          if (input.error) {
            span.setStatus({
              code: SpanStatusCode.ERROR,
              message: `BPP error: ${input.error.code || "unknown"} - ${input.error.message || "no message"}`,
            });
          } else {
            span.setStatus({ code: SpanStatusCode.OK });
          }

          return { message: { ack: { status: "ACK" as const } } };
        } catch (error) {
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

      const messageId = uuidv7();

      await createStatusEntry(
        kv,
        input.orderId,
        input.transactionId,
        input.bppId,
        input.bppUri,
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
          version: "2.0.1",
        },
        message: {
          order_id: input.orderId,
        },
      };

      const statusUrl = input.bppUri.endsWith("/")
        ? `${input.bppUri}status`
        : `${input.bppUri}/status`;

      console.log("[Status] Sending request to:", statusUrl);
      console.log("[Status] Payload:", JSON.stringify(payload, null, 2));

      const response = await ondcClient.send(statusUrl, "POST", payload);

      console.log("[Status] ONDC Response:", JSON.stringify(response, null, 2));

      return {
        ...response,
        transactionId: input.transactionId,
        orderId: input.orderId,
        messageId,
      };
    }),

  onStatus: publicProcedure
    .input(
      z.object({
        context: z
          .object({
            transaction_id: z.string().optional(),
            message_id: z.string().optional(),
            bpp_id: z.string().optional(),
            bpp_uri: z.string().optional(),
          })
          .passthrough()
          .optional(),
        message: z.any().optional(),
        error: z
          .object({
            type: z.string().optional(),
            code: z.string().optional(),
            message: z.string().optional(),
          })
          .passthrough()
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { kv } = ctx;

      console.log(
        "\n\n[on_status] Request Body:\n\n",
        JSON.stringify(input, null, "\t"),
      );

      const orderId = input.message?.order?.id;

      if (input.error) {
        console.error("[on_status] BPP returned error:", input.error);
      }

      if (orderId) {
        await addStatusResponse(
          kv,
          orderId,
          input as Parameters<typeof addStatusResponse>[2],
        );
      } else {
        console.warn("[on_status] Missing order_id in response");
      }

      return {
        message: {
          ack: {
            status: "ACK" as const,
          },
        },
      };
    }),
});
