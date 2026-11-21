import CentredSkeleton from "@/components/skeletons/CentredSkeleton";

/**
 * Sign in.
 *
 * The page waits on nothing server-side, so this only shows during a
 * client-side navigation here, while the route's payload is in flight. It
 * does not stand in for the form: Clerk draws its own loading state once it
 * mounts. See components/skeletons/CentredSkeleton.tsx.
 */
export default function Loading() {
  return <CentredSkeleton label="Loading sign in" height={380} />;
}
