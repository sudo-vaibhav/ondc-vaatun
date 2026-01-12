"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  type PurchaserInfo,
  PurchaserInfoSchema,
  usePurchaser,
} from "@/lib/purchaser-context";

interface PurchaserInfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit?: () => void;
}

export function PurchaserInfoDialog({
  open,
  onOpenChange,
  onSubmit,
}: PurchaserInfoDialogProps) {
  const { purchaserInfo, setPurchaserInfo, hasStoredInfo } = usePurchaser();

  const [formData, setFormData] = useState<PurchaserInfo>(purchaserInfo);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Sync formData when purchaserInfo changes (e.g., loaded from localStorage)
  useEffect(() => {
    setFormData(purchaserInfo);
  }, [purchaserInfo]);

  const handleInputChange = useCallback(
    (field: keyof PurchaserInfo, value: string | boolean) => {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));
      // Clear error when user starts typing
      if (errors[field]) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[field];
          return newErrors;
        });
      }
    },
    [errors],
  );

  const handlePEDDetailChange = useCallback(
    (field: keyof PurchaserInfo["pedDetails"], checked: boolean) => {
      setFormData((prev) => ({
        ...prev,
        pedDetails: {
          ...prev.pedDetails,
          [field]: checked,
        },
      }));
    },
    [],
  );

  const handleSubmit = useCallback(() => {
    const result = PurchaserInfoSchema.safeParse(formData);

    if (!result.success) {
      const newErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const path = issue.path.join(".");
        newErrors[path] = issue.message;
      }
      setErrors(newErrors);
      return;
    }

    setPurchaserInfo(result.data);
    onOpenChange(false);
    onSubmit?.();
  }, [formData, setPurchaserInfo, onOpenChange, onSubmit]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-lg max-h-[90vh]"
        showCloseButton={false}
      >
        <DialogHeader>
          <DialogTitle>
            {hasStoredInfo ? "Confirm Your Details" : "Enter Your Details"}
          </DialogTitle>
          <DialogDescription>
            {hasStoredInfo
              ? "Please confirm your information is correct before proceeding."
              : "Please provide your details to get personalized insurance quotes."}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4 py-2">
            {/* Personal Information */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) =>
                    handleInputChange("firstName", e.target.value)
                  }
                  placeholder="Enter first name"
                  aria-invalid={!!errors.firstName}
                />
                {errors.firstName && (
                  <p className="text-xs text-destructive">{errors.firstName}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) =>
                    handleInputChange("lastName", e.target.value)
                  }
                  placeholder="Enter last name"
                  aria-invalid={!!errors.lastName}
                />
                {errors.lastName && (
                  <p className="text-xs text-destructive">{errors.lastName}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                placeholder="you@example.com"
                aria-invalid={!!errors.email}
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange("phone", e.target.value)}
                placeholder="10-digit mobile number"
                aria-invalid={!!errors.phone}
              />
              {errors.phone && (
                <p className="text-xs text-destructive">{errors.phone}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="relationshipWithProposer">
                Relationship with Proposer
              </Label>
              <Select
                value={formData.relationshipWithProposer}
                onValueChange={(value) =>
                  handleInputChange(
                    "relationshipWithProposer",
                    value as PurchaserInfo["relationshipWithProposer"],
                  )
                }
              >
                <SelectTrigger id="relationshipWithProposer" className="w-full">
                  <SelectValue placeholder="Select relationship" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="self">Self</SelectItem>
                  <SelectItem value="spouse">Spouse</SelectItem>
                  <SelectItem value="child">Child</SelectItem>
                  <SelectItem value="parent">Parent</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Health Information */}
            <div className="space-y-2">
              <Label htmlFor="ped">Pre-existing Disease (PED)</Label>
              <Select
                value={formData.ped}
                onValueChange={(value) =>
                  handleInputChange("ped", value as PurchaserInfo["ped"])
                }
              >
                <SelectTrigger id="ped" className="w-full">
                  <SelectValue placeholder="Select option" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateOfBirth">Date of Birth</Label>
              <Input
                id="dateOfBirth"
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) =>
                  handleInputChange("dateOfBirth", e.target.value)
                }
                aria-invalid={!!errors.dateOfBirth}
              />
              {errors.dateOfBirth && (
                <p className="text-xs text-destructive">{errors.dateOfBirth}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="panNumber">PAN Number</Label>
              <Input
                id="panNumber"
                value={formData.panNumber || ""}
                onChange={(e) =>
                  handleInputChange("panNumber", e.target.value.toUpperCase())
                }
                placeholder="ABCDE1234F"
                maxLength={10}
              />
            </div>

            {/* PED Details */}
            {formData.ped === "yes" && (
              <div className="space-y-3 p-4 rounded-lg bg-muted/50 border">
                <Label className="text-sm font-semibold">PED Details</Label>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="diabetes"
                      checked={formData.pedDetails.diabetes}
                      onCheckedChange={(checked) =>
                        handlePEDDetailChange("diabetes", checked === true)
                      }
                    />
                    <Label
                      htmlFor="diabetes"
                      className="font-normal cursor-pointer"
                    >
                      Diabetes
                    </Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="bloodPressure"
                      checked={formData.pedDetails.bloodPressure}
                      onCheckedChange={(checked) =>
                        handlePEDDetailChange("bloodPressure", checked === true)
                      }
                    />
                    <Label
                      htmlFor="bloodPressure"
                      className="font-normal cursor-pointer"
                    >
                      Blood Pressure / Hypertension
                    </Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="heartAilments"
                      checked={formData.pedDetails.heartAilments}
                      onCheckedChange={(checked) =>
                        handlePEDDetailChange("heartAilments", checked === true)
                      }
                    />
                    <Label
                      htmlFor="heartAilments"
                      className="font-normal cursor-pointer"
                    >
                      Heart Ailments
                    </Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="otherHealthIssues"
                      checked={formData.pedDetails.otherHealthIssues}
                      onCheckedChange={(checked) =>
                        handlePEDDetailChange(
                          "otherHealthIssues",
                          checked === true,
                        )
                      }
                    />
                    <Label
                      htmlFor="otherHealthIssues"
                      className="font-normal cursor-pointer"
                    >
                      Other health issues
                    </Label>
                  </div>
                </div>
              </div>
            )}

            <Separator />

            {/* Physical Information */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="weight">Weight (kg)</Label>
                <Input
                  id="weight"
                  type="number"
                  value={formData.weight || ""}
                  onChange={(e) => handleInputChange("weight", e.target.value)}
                  placeholder="e.g., 70"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="height">Height (cm)</Label>
                <Input
                  id="height"
                  type="number"
                  value={formData.height || ""}
                  onChange={(e) => handleInputChange("height", e.target.value)}
                  placeholder="e.g., 175"
                />
              </div>
            </div>

            <Separator />

            {/* Coverage Information */}
            <div className="space-y-2">
              <Label htmlFor="coverageAmount">Coverage Amount</Label>
              <Input
                id="coverageAmount"
                type="number"
                value={formData.coverageAmount || ""}
                onChange={(e) =>
                  handleInputChange("coverageAmount", e.target.value)
                }
                placeholder="e.g., 500000"
              />
            </div>

            <div className="flex items-center gap-3">
              <Checkbox
                id="panIndiaCover"
                checked={formData.panIndiaCover}
                onCheckedChange={(checked) =>
                  handleInputChange("panIndiaCover", checked === true)
                }
              />
              <Label
                htmlFor="panIndiaCover"
                className="font-normal cursor-pointer"
              >
                Pan India Cover
              </Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pincode">Pincode</Label>
              <Input
                id="pincode"
                value={formData.pincode}
                onChange={(e) => handleInputChange("pincode", e.target.value)}
                placeholder="6-digit pincode"
                maxLength={6}
                aria-invalid={!!errors.pincode}
              />
              {errors.pincode && (
                <p className="text-xs text-destructive">{errors.pincode}</p>
              )}
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button
            type="button"
            onClick={handleSubmit}
            className="w-full sm:w-auto"
          >
            {hasStoredInfo ? "Confirm & Continue" : "Submit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
