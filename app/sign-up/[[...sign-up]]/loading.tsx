import CentredSkeleton from "@/components/skeletons/CentredSkeleton";

/**
 * Sign up.
 *
 * Same as sign-in: it only shows during a client-side navigation here, and
 * it is not the form, which Clerk draws (with its own loading state).
 */
export default function Loading() {
  return <CentredSkeleton label="Loading sign up" height={380} />;
}
