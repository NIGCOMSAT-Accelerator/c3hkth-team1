import { SignupForm } from "@/components/SignupForm";
import { fetchPublicWards } from "@/lib/api";

export default async function SignupPage() {
  const wards = await fetchPublicWards();

  return <SignupForm wards={wards} />;
}
