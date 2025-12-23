import { __internal_do_not_import_getTenant } from "@/entities/tenant";
import { ONDCClient } from "./ondc/client";

export const getContext = () => {
  const tenant = __internal_do_not_import_getTenant();
  const ondcClient = new ONDCClient(tenant);
  return { tenant, ondcClient };
};
