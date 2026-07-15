import { registerEnumType } from "@nestjs/graphql";

export enum ListingStatusEnum {
  ACTIVE = "ACTIVE",
  CANCELLED = "CANCELLED",
  SOLD = "SOLD",
}

registerEnumType(ListingStatusEnum, { name: "ListingStatus" });
