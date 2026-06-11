import { redirect } from "next/navigation";

export default function UploadsIndex() {
  redirect("/dashboard/uploads/new");
}
