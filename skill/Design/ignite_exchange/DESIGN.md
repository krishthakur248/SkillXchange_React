---
name: Ignite & Exchange
colors:
  surface: '#f9f9fc'
  surface-dim: '#dadadc'
  surface-bright: '#f9f9fc'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3f6'
  surface-container: '#eeeef0'
  surface-container-high: '#e8e8ea'
  surface-container-highest: '#e2e2e5'
  on-surface: '#1a1c1e'
  on-surface-variant: '#434656'
  inverse-surface: '#2f3133'
  inverse-on-surface: '#f0f0f3'
  outline: '#737688'
  outline-variant: '#c3c5d9'
  surface-tint: '#004ee7'
  primary: '#0043c8'
  on-primary: '#ffffff'
  primary-container: '#0057ff'
  on-primary-container: '#e5e8ff'
  inverse-primary: '#b6c4ff'
  secondary: '#006b5c'
  on-secondary: '#ffffff'
  secondary-container: '#68fadd'
  on-secondary-container: '#007261'
  tertiary: '#704900'
  on-tertiary: '#ffffff'
  tertiary-container: '#905f00'
  on-tertiary-container: '#ffe6c8'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dce1ff'
  primary-fixed-dim: '#b6c4ff'
  on-primary-fixed: '#001550'
  on-primary-fixed-variant: '#003ab2'
  secondary-fixed: '#68fadd'
  secondary-fixed-dim: '#44ddc1'
  on-secondary-fixed: '#00201a'
  on-secondary-fixed-variant: '#005145'
  tertiary-fixed: '#ffddb3'
  tertiary-fixed-dim: '#ffb950'
  on-tertiary-fixed: '#291800'
  on-tertiary-fixed-variant: '#624000'
  background: '#f9f9fc'
  on-background: '#1a1c1e'
  surface-variant: '#e2e2e5'
typography:
  display-lg:
    fontFamily: Montserrat
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Montserrat
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.01em
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
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.05em
  caption:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: '1.4'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 8px
  sm: 16px
  md: 24px
  lg: 40px
  xl: 64px
  container-max: 1280px
  gutter: 24px
---

## Brand & Style
The design system is built on the philosophy of mutual empowerment and collaborative growth. It balances the rigor of professional development with the warmth of a community-driven ecosystem. The visual direction is a blend of **Corporate Modern** and **High-Contrast Bold**, utilizing sharp execution and generous whitespace to foster a sense of clarity and focus.

The emotional response should be one of "structured inspiration"—where users feel they are entering a reliable, high-tech platform that nonetheless values their individual contribution and creative spark. The interface emphasizes "openness" through wide gutters and clear visual hierarchies, ensuring that the process of finding a mentor or mentee feels frictionless and welcoming.

## Colors
The palette is centered around three functional pillars:
- **Ignite Blue (Primary):** Represents the foundation of trust and technical innovation. Used for primary actions, active states, and structural branding.
- **Equality Teal (Secondary):** Symbolizes the balance of a two-way exchange and professional growth. Used for success states, progress indicators, and collaborative features.
- **Innovate Amber (Accent):** Captures energy and the "spark" of a new idea. Used sparingly for highlights, notifications, and high-impact calls-to-action.

The background uses a tiered neutral system, starting from a pure white (#FFFFFF) base with subtle cool-gray offsets (#F8FAFC) to define content areas without introducing heavy visual weight.

## Typography
The typography system pairs the geometric confidence of **Montserrat** for headings with the systematic clarity of **Inter** for body text. 

- **Headlines:** Use Montserrat to convey energy and momentum. Tighten letter spacing on larger sizes to maintain a modern, "impactful" look.
- **Body:** Use Inter for all reading-heavy content. Its high x-height ensures legibility during complex skill-sharing descriptions.
- **Labels:** Use Inter Semi-Bold with a slight uppercase track to distinguish metadata and categorization tags from general body text.

## Layout & Spacing
This design system utilizes a **Fluid Grid** model based on an 8pt spatial rhythm. 

- **Desktop:** 12-column grid with a 1280px max-width. Gutters are fixed at 24px to ensure breathing room between dense skill cards.
- **Tablet:** 8-column grid with 24px margins. Elements should begin to stack or use horizontal carousels for skill categories.
- **Mobile:** 4-column grid with 16px margins. Primary actions should be pinned or full-width to accommodate touch targets.

Spacing is used aggressively to separate disparate content sections, favoring "lg" (40px) and "xl" (64px) increments to reinforce the sense of openness and accessibility.

## Elevation & Depth
The design system employs **Ambient Shadows** to create a sense of tactile hierarchy without cluttering the interface.

- **Level 0 (Flat):** Used for the main background.
- **Level 1 (Low):** 1px subtle border (#E2E8F0) with no shadow. Used for input fields and static cards.
- **Level 2 (Medium):** A soft, diffused shadow (0px 4px 20px rgba(0, 0, 0, 0.05)). Used for skill cards and interactive elements on hover.
- **Level 3 (High):** A deep, multi-layered shadow with a slight Blue tint (0px 12px 32px rgba(0, 87, 255, 0.1)). Reserved for modals, dropdowns, and floating action buttons.

Depth is also communicated through **Tonal Layers**, where secondary information sits on slightly darker "Surface-Container" backgrounds.

## Shapes
The shape language is consistently **Rounded**, reflecting the approachable and friendly nature of a community platform. 

- **Buttons & Inputs:** Use the standard `0.5rem` (8px) radius to feel modern and professional.
- **Skill Chips & Badges:** Use `rounded-xl` (1.5rem) to create a distinct, pill-shaped "tag" look that separates skills from interactive buttons.
- **Cards & Containers:** Use `rounded-lg` (1rem) for large surface areas to soften the layout and make the community feel more inviting.

## Components

### Buttons
- **Primary:** Solid "Ignite Blue" with white text. High-contrast, 8px corner radius.
- **Secondary:** Outlined "Equality Teal" with 2px border. For secondary actions like "View Profile".
- **Ghost:** No background or border, using "Ignite Blue" text. Used for less prominent navigation.

### Skill Chips
Small, pill-shaped labels. "Innovate Amber" is used for trending skills, while a light "Equality Teal" background with dark teal text is used for standard skill categories.

### Input Fields
Large, accessible touch targets (48px height) with a 1px soft border. On focus, the border transitions to a 2px "Ignite Blue" stroke with a subtle outer glow.

### Cards
SkillXchange cards are the heart of the system. They use a Level 2 elevation on hover, include a top-accent bar in Primary or Secondary colors to denote "Offering" vs. "Seeking", and use generous internal padding (24px).

### Progress Indicators
Used for "Mentorship Milestones". These should utilize "Equality Teal" to symbolize growth and completion.

### Avatars
Circular avatars with a 2px "Ignite Blue" border to signify "Online" or "Available for Mentor" status.