/** Explore and Shop are the two modes (see ModeToggle); these are the other places in the persistent navigation. */
export const primaryLinks = [
  { href: "/brands", label: "Brands" },
  { href: "/categories", label: "Categories" },
  { href: "/style-creator", label: "Outfit Studio" },
  { href: "/virtual-try-on", label: "Try it on" },
  { href: "/for-you", label: "For you" },
  { href: "/assistant", label: "AI Stylist" },
] as const;

export const accountLinks = [
  { href: "/favorites", label: "Favorites" },
  { href: "/cart", label: "Cart" },
  { href: "/orders", label: "Orders" },
  { href: "/account", label: "Account" },
] as const;
