import { redirect } from "next/navigation";

export default function CreateProductPage() {
  redirect("/finance/products?create=1");
}
