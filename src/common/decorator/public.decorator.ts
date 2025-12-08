import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC_KEY = 'isPublic';

export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

// Adds metadata isPublic = true on the route.
// Our AuthGuard will read this and skip auth check if route is public.