/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Combined colors
        "tertiary-container": "#535a70",
        "on-surface": "#191c1e",
        "inverse-primary": "#b2c5ff",
        "secondary-fixed": "#d3e4fe",
        "surface-dim": "#d8dadc",
        "surface-container-highest": "#e0e3e5",
        "surface-container-lowest": "#ffffff",
        "on-tertiary-fixed": "#131b2e",
        "surface": "#f7f9fb",
        "primary-fixed": "#dae2ff",
        "on-tertiary": "#ffffff",
        "on-primary-container": "#c4d2ff",
        "inverse-surface": "#2d3133",
        "on-secondary-fixed-variant": "#38485d",
        "surface-container": "#eceef0",
        "secondary": "#505f76",
        "outline-variant": "#c3c6d6",
        "on-surface-variant": "#434654",
        "primary-container": "#0052cc",
        "surface-container-low": "#f0f3ff",
        "on-secondary": "#ffffff",
        "on-primary-fixed-variant": "#0040a2",
        "tertiary": "#3b4358",
        "on-error-container": "#93000a",
        "surface-bright": "#f7f9fb",
        "outline": "#737685",
        "on-secondary-container": "#54647a",
        "on-secondary-fixed": "#0b1c30",
        "tertiary-fixed-dim": "#bec6e0",
        "on-primary": "#ffffff",
        "on-tertiary-container": "#cbd2ec",
        "background": "#f7f9fb",
        "error-container": "#ffdad6",
        "error": "#ba1a1a",
        "on-error": "#ffffff",
        "surface-container-high": "#e6e8ea",
        "inverse-on-surface": "#eff1f3",
        "secondary-fixed-dim": "#b7c8e1",
        "on-primary-fixed": "#001848",
        "primary-fixed-dim": "#b2c5ff",
        "primary": "#003d9b",
        "secondary-container": "#d0e1fb",
        "on-tertiary-fixed-variant": "#3f465c",
        "on-background": "#191c1e",
        "tertiary-fixed": "#dae2fd",
        "surface-variant": "#e0e3e5",
        "surface-tint": "#0c56d0"
      },
      borderRadius: {
        "DEFAULT": "0.25rem",
        "lg": "0.5rem",
        "xl": "0.75rem",
        "full": "9999px"
      },
      spacing: {
        // Old spacings
        "unit": "4px",
        "stack-xs": "4px",
        "stack-sm": "8px",
        "stack-md": "16px",
        "stack-lg": "24px",
        "container-max": "1440px",
        // New spacings
        "gutter": "24px",
        "base": "4px",
        "md": "16px",
        "margin-mobile": "16px",
        "max-width": "1440px",
        "xs": "4px",
        "xl": "32px",
        "2xl": "48px",
        "lg": "24px",
        "sm": "8px",
        "3xl": "64px",
        "margin-desktop": "40px"
      },
      maxWidth: {
        "max-width": "1440px",
      },
      fontFamily: {
        "body-lg": ["Inter", "sans-serif"],
        "headline-md": ["Inter", "sans-serif"],
        "display-lg": ["Inter", "sans-serif"],
        "body-md": ["Inter", "sans-serif"],
        "headline-sm": ["Inter", "sans-serif"],
        "label-md": ["Inter", "sans-serif"],
        "tabular-nums": ["Inter", "sans-serif"],
        // New fonts
        "label-sm": ["Inter", "sans-serif"],
        "body-sm": ["Inter", "sans-serif"],
        "headline-lg-mobile": ["Inter", "sans-serif"],
        "headline-lg": ["Inter", "sans-serif"]
      },
      fontSize: {
        "body-lg": ["18px", { "lineHeight": "28px", "fontWeight": "400" }],
        "headline-md": ["24px", { "lineHeight": "32px", "letterSpacing": "-0.01em", "fontWeight": "600" }],
        "display-lg": ["48px", { "lineHeight": "56px", "letterSpacing": "-0.02em", "fontWeight": "700" }],
        "body-md": ["16px", { "lineHeight": "24px", "fontWeight": "400" }],
        "headline-sm": ["20px", { "lineHeight": "28px", "fontWeight": "600" }],
        "label-md": ["14px", { "lineHeight": "20px", "fontWeight": "500" }],
        "tabular-nums": ["14px", { "lineHeight": "20px", "fontWeight": "400" }],
        // New font sizes
        "label-sm": ["12px", { "lineHeight": "16px", "letterSpacing": "0.02em", "fontWeight": "600" }],
        "body-sm": ["14px", { "lineHeight": "20px", "fontWeight": "400" }],
        "headline-lg-mobile": ["24px", { "lineHeight": "32px", "letterSpacing": "-0.01em", "fontWeight": "600" }],
        "headline-lg": ["32px", { "lineHeight": "40px", "letterSpacing": "-0.02em", "fontWeight": "600" }]
      }
    },
  },
  plugins: [
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('@tailwindcss/forms'),
  ],
}
