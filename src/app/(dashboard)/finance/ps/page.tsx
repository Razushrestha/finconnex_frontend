import { redirect } from "next/navigation";

/** Legacy sidebar path `/finance/ps` → products catalogue */
export default function LegacyProductsRedirect() {
  redirect("/finance/products");
}
