# Vestora design system (Stage 2)

Live reference: run the app and open `/design-system`.

## Tokens (`src/app/globals.css`)
Single source of truth, defined in Tailwind's `@theme`. Components use token utilities (`bg-paper`, `text-ink`, `border-line`, `rounded-md`, `shadow-card`, `font-display`) and never raw hex values.
- Colors: paper, surface, ink, mute, line, accent, accent-ink (accent for text), ok, warn, danger.
- Type: serif display (`font-display`) + sans body; `text-display` and `text-headline` are fluid.
- Radius 2/6/12px, shadows `card`/`pop`, motion 120/200/400ms with one easing, breakpoints sm 40 · md 48 · lg 64 · xl 80 · 2xl 96rem.

## Department identities
Wrap content in `<ThemeScope theme="street">`. Themes `luxury`, `street`, `minimal`, `tech` override the same tokens, so every component restyles with no per-page CSS. A department's `theme_key` in the database selects its theme.

## Components
- `components/ui`: Button, Logo, Icon, Dialog (Modal, Drawer), ThemeScope, CatalogNotice.
- `components/layout`: SiteHeader, MobileNav, SearchButton, AccountMenu, Cart/Favorites indicators, SiteFooter, PageShell, ComingSoon.
- `components/feedback`: ToastViewport, EmptyState, ErrorState, Spinner, Skeleton.
- `components/product`: ProductCard, ProductLabel (derived from inventory), ProductFilters (GET form, URL-driven), ProductInfoPanel, FavoriteButton.
- `components/showroom`: Showroom, ShowroomScene, Minimap, ShowroomLoader.

## Accessibility
Skip link, landmarks, native `<dialog>` (focus trap, Escape), visible `:focus-visible` ring, aria labels/pressed/expanded, `prefers-reduced-motion` (CSS animations and orbit damping), text contrast ≥ 4.5:1 for default theme.

## Not built yet (shells only)
Account, checkout, orders, admin, style quiz/creator, try-on, assistant, collections. Sign-in, add-to-cart on product pages and cart pricing arrive in later stages.
