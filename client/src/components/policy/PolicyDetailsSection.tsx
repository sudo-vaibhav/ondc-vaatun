import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PolicyDetailsSectionProps {
  items?: Array<{
    descriptor?: { name?: string; short_desc?: string };
    tags?: Array<{
      descriptor?: { name?: string; code?: string };
      list?: Array<{
        descriptor?: { name?: string; code?: string };
        value?: string;
      }>;
    }>;
  }>;
  quote?: {
    price?: { currency?: string; value?: string };
    breakup?: Array<{
      title?: string;
      price?: { currency?: string; value?: string };
    }>;
  };
  fulfillments?: Array<{
    customer?: {
      person?: { name?: string };
      contact?: { email?: string; phone?: string };
    };
    state?: {
      descriptor?: { code?: string; name?: string };
    };
  }>;
}

export function PolicyDetailsSection({
  items,
  quote,
  fulfillments,
}: PolicyDetailsSectionProps) {
  const item = items?.[0];
  const fulfillment = fulfillments?.[0];
  const customer = fulfillment?.customer;

  // Extract coverage details from tags
  const coverageTag = item?.tags?.find(
    (t) =>
      t.descriptor?.code === "GENERAL_INFO" ||
      t.descriptor?.name === "General Information",
  );
  const coverageDetails = coverageTag?.list || [];

  return (
    <div className="space-y-4">
      {/* Coverage Details */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Coverage Details</CardTitle>
        </CardHeader>
        <CardContent>
          {item?.descriptor?.short_desc && (
            <p className="text-sm text-muted-foreground mb-4">
              {item.descriptor.short_desc}
            </p>
          )}
          {coverageDetails.length > 0 && (
            <div className="grid grid-cols-2 gap-3 text-sm">
              {coverageDetails.map((detail, idx) => (
                <div key={idx}>
                  <p className="text-muted-foreground">
                    {detail.descriptor?.name || detail.descriptor?.code}
                  </p>
                  <p className="font-medium">{detail.value}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Premium Breakdown */}
      {quote?.breakup && quote.breakup.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Premium Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {quote.breakup.map((item, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{item.title}</span>
                  <span>
                    {item.price?.currency === "INR" ? "Rs. " : ""}
                    {item.price?.value}
                  </span>
                </div>
              ))}
              <div className="flex justify-between font-semibold pt-2 border-t">
                <span>Total Premium</span>
                <span>Rs. {quote.price?.value}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Insured Details */}
      {customer && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Insured Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">Name</p>
                <p className="font-medium">{customer.person?.name || "-"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Email</p>
                <p className="font-medium">{customer.contact?.email || "-"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Phone</p>
                <p className="font-medium">{customer.contact?.phone || "-"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Status</p>
                <p className="font-medium">
                  {fulfillment?.state?.descriptor?.name ||
                    fulfillment?.state?.descriptor?.code ||
                    "Active"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
