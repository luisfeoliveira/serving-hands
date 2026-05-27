import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { roleToPath } from "@/lib/roles";
import { listUsers } from "./actions";
import { UsersClient } from "./users-client";

export default async function UsuariosPage() {
  const profile = await requireProfile();
  if (profile.role !== "admin") {
    redirect(roleToPath(profile.role));
  }

  const users = await listUsers();

  return <UsersClient initialUsers={users} />;
}
