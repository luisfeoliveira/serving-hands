import { redirect } from "next/navigation";

// Root redirects to /login — middleware handles auth check
export default function Home() {
  redirect("/login");
}
