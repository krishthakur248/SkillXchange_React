---
name: Academic Exchange
colors:
  surface: '#f7f9ff'
  surface-dim: '#d7dadf'
  surface-bright: '#f7f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f1f4f9'
  surface-container: '#ebeef3'
  surface-container-high: '#e5e8ee'
  surface-container-highest: '#e0e3e8'
  on-surface: '#181c20'
  on-surface-variant: '#3e4946'
  inverse-surface: '#2d3135'
  inverse-on-surface: '#eef1f6'
  outline: '#6e7976'
  outline-variant: '#bec9c5'
  surface-tint: '#006b5c'
  primary: '#005145'
  on-primary: '#ffffff'
  primary-container: '#006b5c'
  on-primary-container: '#95e8d5'
  inverse-primary: '#83d6c3'
  secondary: '#0059bb'
  on-secondary: '#ffffff'
  secondary-container: '#0070ea'
  on-secondary-container: '#fefcff'
  tertiary: '#454748'
  on-tertiary: '#ffffff'
  tertiary-container: '#5c5f60'
  on-tertiary-container: '#d8d9da'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#9ff2df'
  primary-fixed-dim: '#83d6c3'
  on-primary-fixed: '#00201b'
  on-primary-fixed-variant: '#005045'
  secondary-fixed: '#d8e2ff'
  secondary-fixed-dim: '#adc7ff'
  on-secondary-fixed: '#001a41'
  on-secondary-fixed-variant: '#004493'
  tertiary-fixed: '#e1e3e4'
  tertiary-fixed-dim: '#c5c7c8'
  on-tertiary-fixed: '#191c1d'
  on-tertiary-fixed-variant: '#454748'
  background: '#f7f9ff'
  on-background: '#181c20'
  surface-variant: '#e0e3e8'
typography:
  headline-lg:
    fontFamily: Montserrat
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Montserrat
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  headline-sm:
    fontFamily: Montserrat
    fontSize: 20px
    fontWeight: '600'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Montserrat
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Montserrat
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  body-sm:
    fontFamily: Montserrat
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label-lg:
    fontFamily: Montserrat
    fontSize: 14px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.5px
  label-sm:
    fontFamily: Montserrat
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1'
    letterSpacing: 0.3px
  headline-lg-mobile:
    fontFamily: Montserrat
    fontSize: 26px
    fontWeight: '700'
    lineHeight: '1.2'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  container-padding: 20px
  gutter: 16px
---

## Brand & Style

This design system establishes a professional, academic-inspired aesthetic that merges institutional reliability with modern digital interaction. It targets students, educators, and lifelong learners who value clarity and structured information.

The design style is **Corporate / Modern** with a strong emphasis on **Tonal Layers**. It utilizes a clean white foundation, punctuated by deep scholarly greens and energetic blues. The emotional response is one of trust, focus, and organized progress. Distinctive rounded card containers and soft shadows create a tactile sense of depth without clutter, ensuring that educational content remains the primary focus.

## Colors

The palette is anchored by **Deep Academic Green**, providing a sense of growth and institutional authority. This is balanced by **Ignite Blue**, used specifically for interactive elements and primary calls to action to maintain high engagement.

- **Primary:** #006b5c (Green) used for headers, success states, and primary branding.
- **Secondary:** #007bff (Blue) used for action-oriented buttons and link states.
- **Tertiary:** #f8f9fa (Off-white) used for container backgrounds to distinguish sections from the pure white base.
- **Neutral:** A range of grays from #212529 for text to #e9ecef for borders.

Backgrounds should remain primarily white (#ffffff) to ensure maximum readability and a "fresh" academic feel.

## Typography

The design system exclusively uses **Montserrat** to provide a clean, geometric, and modern feel. The typeface’s high x-height and open apertures ensure excellent legibility across mobile and desktop interfaces.

Headlines use bold weights to establish a clear hierarchy, while body text remains at a medium weight for comfortable long-form reading. Labels and utility text use increased letter spacing and semi-bold weights to differentiate them from prose.

## Layout & Spacing

The layout follows a **Fluid Grid** model with a base unit of 4px. 

- **Mobile:** A 4-column grid with 20px side margins and 16px gutters.
- **Desktop:** A 12-column grid centered at a maximum width of 1280px.

Spacing is applied mathematically (4, 8, 16, 24, 32). Large card components should utilize a consistent 20px internal padding to maintain the "breathable" quality seen in the reference material. Vertical rhythm is maintained by using the `lg` (24px) unit between major sections.

## Elevation & Depth

Hierarchy is established through **Tonal Layers** and **Ambient Shadows**. 

Surfaces are elevated using subtle, highly diffused shadows (Hex: #000000 at 5%–8% opacity) with a large blur radius (12px–20px) and zero spread. This "soft-lift" effect separates card content from the background without creating harsh visual breaks. 

Secondary elevation (e.g., dropdowns or modals) uses a slightly deeper shadow with a 2px vertical offset to suggest physical stacking.

## Shapes

The shape language is defined by a **Rounded** philosophy. Standard interface elements (buttons, inputs) utilize a 0.5rem (8px) corner radius. 

Large container elements, such as course cards and profile sections, utilize a more pronounced radius (1rem or 16px) to echo the friendly, approachable aesthetic of the mobile screens. Selection indicators and tags use a fully pill-shaped (100px) radius to distinguish them from structural containers.

## Components

### Buttons
- **Primary:** Academic Green background, white text, 8px radius.
- **Secondary:** Ignite Blue background, white text, 8px radius.
- **Tertiary/Ghost:** Academic Green border (1px), Academic Green text, no background.

### Cards
Cards are the primary container. They feature a white background, 16px corner radius, and a soft ambient shadow. Course cards include a 2px top-border accent in either Green or Blue to denote category.

### Input Fields
Inputs are white with a light gray border (#ced4da) and 8px radius. On focus, the border transitions to Ignite Blue with a 2px soft glow.

### Chips & Tags
Used for course categories or skill levels. They feature a subtle pastel background version of the primary colors (e.g., 10% opacity Green) with high-contrast text.

### Navigation
Bottom navigation for mobile uses clean, thin-line icons with a 2px Academic Green indicator under the active state. The background is pure white with a subtle 1px top border.