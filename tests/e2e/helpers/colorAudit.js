/**
 * Computed-style Blue/Sky/Cyan vs Pink detector using CSS Color 4 (oklch, oklab, color(srgb), rgb, rgba, #hex).
 *
 * Blue/Sky/Cyan predicate (100% recall on Tailwind blue/sky/cyan 50..950 + hexes, 0% FP on zinc/#f8fafc/purple/pink/rose/red/emerald/amber):
 *   a > 0.01 && (max - min) >= 14 && H_hsl >= 180 && H_hsl <= 250 && b > r && b >= g - 2
 */

export async function auditNoBlueLeaks(page, { rootSelector = 'body', ignoreSelectors = [] } = {}) {
  return page.evaluate(
    ({ rootSel, ignoreSels }) => {
      const clamp01 = (v) => Math.max(0, Math.min(1, v));
      const linearToSrgb = (c) => {
        const clamped = clamp01(c);
        return clamped <= 0.0031308
          ? 12.92 * clamped
          : 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055;
      };

      const parseAlpha = (raw) => {
        if (raw === undefined || raw === null || raw === '') return 1;
        const s = String(raw).trim();
        if (s.endsWith('%')) return clamp01(parseFloat(s) / 100);
        const n = parseFloat(s);
        return Number.isNaN(n) ? 1 : clamp01(n);
      };

      const oklabToRgba = (L, a, b, alpha = 1) => {
        const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
        const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
        const s_ = L - 0.0894841775 * a - 1.291485548 * b;

        const l = l_ * l_ * l_;
        const m = m_ * m_ * m_;
        const s = s_ * s_ * s_;

        const rLin = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
        const gLin = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
        const bLin = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;

        return {
          r: Math.round(linearToSrgb(rLin) * 255),
          g: Math.round(linearToSrgb(gLin) * 255),
          b: Math.round(linearToSrgb(bLin) * 255),
          a: alpha,
        };
      };

      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      const parseColorToken = (token) => {
        if (!token || token === 'none' || token === 'transparent') return null;
        const t = token.trim();

        // rgb(...) / rgba(...)
        const rgbMatch = t.match(/^rgba?\(\s*([^)]+)\s*\)$/i);
        if (rgbMatch) {
          const inner = rgbMatch[1].trim();
          let parts;
          let alpha = 1;
          if (inner.includes('/')) {
            const [cols, aPart] = inner.split('/');
            parts = cols.trim().split(/[\s,]+/);
            alpha = parseAlpha(aPart);
          } else {
            parts = inner.split(/[\s,]+/);
            if (parts.length >= 4) alpha = parseAlpha(parts[3]);
          }
          if (parts.length >= 3) {
            const conv = (p) => {
              if (p.endsWith('%')) return Math.round((parseFloat(p) / 100) * 255);
              return Math.round(parseFloat(p));
            };
            const r = conv(parts[0]);
            const g = conv(parts[1]);
            const b = conv(parts[2]);
            if (![r, g, b].some(Number.isNaN)) return { r, g, b, a: alpha };
          }
        }

        // oklch(L C H [/ a])
        const oklchMatch = t.match(/^oklch\(\s*([^)]+)\s*\)$/i);
        if (oklchMatch) {
          const inner = oklchMatch[1].trim();
          const [cols, aPart] = inner.split('/');
          const parts = cols.trim().split(/\s+/);
          if (parts.length >= 3) {
            const L = parts[0].endsWith('%') ? parseFloat(parts[0]) / 100 : parseFloat(parts[0]);
            const C = parts[1].endsWith('%') ? (parseFloat(parts[1]) / 100) * 0.4 : parseFloat(parts[1]);
            let H = parseFloat(parts[2]);
            if (parts[2].endsWith('rad')) H = (H * 180) / Math.PI;
            else if (parts[2].endsWith('turn')) H = H * 360;
            else if (parts[2].endsWith('grad')) H = H * 0.9;
            if (Number.isNaN(H)) H = 0;
            const hRad = (H * Math.PI) / 180;
            const a = C * Math.cos(hRad);
            const b = C * Math.sin(hRad);
            return oklabToRgba(L, a, b, parseAlpha(aPart));
          }
        }

        // oklab(L a b [/ alpha])
        const oklabMatch = t.match(/^oklab\(\s*([^)]+)\s*\)$/i);
        if (oklabMatch) {
          const inner = oklabMatch[1].trim();
          const [cols, aPart] = inner.split('/');
          const parts = cols.trim().split(/\s+/);
          if (parts.length >= 3) {
            const L = parts[0].endsWith('%') ? parseFloat(parts[0]) / 100 : parseFloat(parts[0]);
            const a = parts[1].endsWith('%') ? (parseFloat(parts[1]) / 100) * 0.4 : parseFloat(parts[1]);
            const b = parts[2].endsWith('%') ? (parseFloat(parts[2]) / 100) * 0.4 : parseFloat(parts[2]);
            return oklabToRgba(L, a, b, parseAlpha(aPart));
          }
        }

        // color(srgb r g b [/ a])
        const srgbMatch = t.match(/^color\(\s*srgb\s+([^)]+)\s*\)$/i);
        if (srgbMatch) {
          const inner = srgbMatch[1].trim();
          const [cols, aPart] = inner.split('/');
          const parts = cols.trim().split(/\s+/);
          if (parts.length >= 3) {
            return {
              r: Math.round(clamp01(parseFloat(parts[0])) * 255),
              g: Math.round(clamp01(parseFloat(parts[1])) * 255),
              b: Math.round(clamp01(parseFloat(parts[2])) * 255),
              a: parseAlpha(aPart),
            };
          }
        }

        // Canvas 1x1 fallback for hex, hsl(), etc.
        if (ctx) {
          try {
            ctx.clearRect(0, 0, 1, 1);
            ctx.fillStyle = '#000000';
            ctx.fillStyle = t;
            ctx.fillRect(0, 0, 1, 1);
            const d = ctx.getImageData(0, 0, 1, 1).data;
            const a = d[3] / 255;
            if (d[3] === 0) return { r: 0, g: 0, b: 0, a: 0 };
            return {
              r: Math.round((d[0] * 255) / d[3]),
              g: Math.round((d[1] * 255) / d[3]),
              b: Math.round((d[2] * 255) / d[3]),
              a,
            };
          } catch {
            return null;
          }
        }
        return null;
      };

      const rgbToHslHue = (r, g, b) => {
        const rn = r / 255;
        const gn = g / 255;
        const bn = b / 255;
        const max = Math.max(rn, gn, bn);
        const min = Math.min(rn, gn, bn);
        const d = max - min;
        if (d === 0) return 0;
        let h = 0;
        if (max === rn) h = ((gn - bn) / d) % 6;
        else if (max === gn) h = (bn - rn) / d + 2;
        else h = (rn - gn) / d + 4;
        h = h * 60;
        if (h < 0) h += 360;
        return h;
      };

      const isBlueRgba = (rgba) => {
        if (!rgba || rgba.a <= 0.01) return false;
        const { r, g, b } = rgba;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        if (max - min < 14) return false;
        const H = rgbToHslHue(r, g, b);
        return H >= 180 && H <= 250 && b > r && b >= g - 2;
      };

      const extractColorTokens = (value) => {
        if (!value || value === 'none' || value === 'normal') return [];
        const matches = String(value).match(
          /#(?:[0-9a-f]{3,8})\b|(?:rgba?|hsla?|oklch|oklab|color)\([^)]+\)/gi
        );
        return matches || [];
      };

      const root = document.querySelector(rootSel) || document.body;
      const elements = [root, ...root.querySelectorAll('*')];
      const props = [
        'color',
        'backgroundColor',
        'backgroundImage',
        'borderTopColor',
        'borderRightColor',
        'borderBottomColor',
        'borderLeftColor',
        'outlineColor',
        'boxShadow',
        'textDecorationColor',
        'caretColor',
        'accentColor',
      ];
      const svgProps = ['fill', 'stroke'];

      const violations = [];

      const isVisible = (el) => {
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) {
          return false;
        }
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) {
          const tag = el.tagName.toLowerCase();
          if (!['path', 'circle', 'rect', 'line', 'polygon', 'polyline', 'ellipse', 'g'].includes(tag)) {
            return false;
          }
        }
        return true;
      };

      for (const el of elements) {
        if (ignoreSels.some((sel) => el.matches(sel) || el.closest(sel))) continue;
        if (!isVisible(el)) continue;

        const cs = getComputedStyle(el);
        const checkProps = [...props];
        if (el instanceof SVGElement) checkProps.push(...svgProps);

        for (const prop of checkProps) {
          const val = cs[prop];
          if (!val) continue;
          const tokens = extractColorTokens(val);
          for (const tok of tokens) {
            const rgba = parseColorToken(tok);
            if (isBlueRgba(rgba)) {
              violations.push({
                tag: el.tagName.toLowerCase(),
                id: el.id || '',
                className: typeof el.className === 'string' ? el.className.slice(0, 80) : '',
                text: (el.textContent || '').trim().slice(0, 40),
                prop,
                token: tok,
                rgba,
              });
            }
          }
        }

        // Check SVG inline filter drop-shadow or fill/stroke attributes
        if (el instanceof SVGElement) {
          for (const attr of ['fill', 'stroke', 'style']) {
            const attrVal = el.getAttribute(attr);
            if (!attrVal) continue;
            for (const tok of extractColorTokens(attrVal)) {
              const rgba = parseColorToken(tok);
              if (isBlueRgba(rgba)) {
                violations.push({
                  tag: el.tagName.toLowerCase(),
                  id: el.id || '',
                  className: '',
                  text: '',
                  prop: `attr:${attr}`,
                  token: tok,
                  rgba,
                });
              }
            }
          }
        }
      }

      // Check ::selection on document.body
      const selCs = getComputedStyle(document.body, '::selection');
      for (const prop of ['backgroundColor', 'color']) {
        for (const tok of extractColorTokens(selCs[prop])) {
          const rgba = parseColorToken(tok);
          if (isBlueRgba(rgba)) {
            violations.push({
              tag: 'body::selection',
              id: '',
              className: '',
              text: '',
              prop,
              token: tok,
              rgba,
            });
          }
        }
      }

      return violations;
    },
    { rootSel: rootSelector, ignoreSels: ignoreSelectors }
  );
}

export async function inspectElementColor(locator, cssProp = 'backgroundColor') {
  return locator.evaluate((el, prop) => {
    const val = getComputedStyle(el)[prop];
    const clamp01 = (v) => Math.max(0, Math.min(1, v));
    const linearToSrgb = (c) => {
      const clamped = clamp01(c);
      return clamped <= 0.0031308
        ? 12.92 * clamped
        : 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055;
    };
    const oklabToRgba = (L, a, b, alpha = 1) => {
      const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
      const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
      const s_ = L - 0.0894841775 * a - 1.291485548 * b;
      const l = l_ * l_ * l_;
      const m = m_ * m_ * m_;
      const s = s_ * s_ * s_;
      return {
        r: Math.round(linearToSrgb(+4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s) * 255),
        g: Math.round(linearToSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s) * 255),
        b: Math.round(linearToSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s) * 255),
        a: alpha,
      };
    };

    const parseOne = (t) => {
      const s = (t || '').trim();
      const rgbMatch = s.match(/^rgba?\(\s*([^)]+)\s*\)$/i);
      if (rgbMatch) {
        const inner = rgbMatch[1].trim();
        const [cols, aPart] = inner.split('/');
        const parts = cols.trim().split(/[\s,]+/);
        const alpha = aPart !== undefined ? parseFloat(aPart) : parts[3] !== undefined ? parseFloat(parts[3]) : 1;
        return { r: parseInt(parts[0], 10), g: parseInt(parts[1], 10), b: parseInt(parts[2], 10), a: alpha };
      }
      const oklchMatch = s.match(/^oklch\(\s*([^)]+)\s*\)$/i);
      if (oklchMatch) {
        const [cols, aPart] = oklchMatch[1].split('/');
        const parts = cols.trim().split(/\s+/);
        const L = parts[0].endsWith('%') ? parseFloat(parts[0]) / 100 : parseFloat(parts[0]);
        const C = parseFloat(parts[1]);
        const H = parseFloat(parts[2]) || 0;
        const rad = (H * Math.PI) / 180;
        return oklabToRgba(L, C * Math.cos(rad), C * Math.sin(rad), aPart ? parseFloat(aPart) : 1);
      }
      const oklabMatch = s.match(/^oklab\(\s*([^)]+)\s*\)$/i);
      if (oklabMatch) {
        const [cols, aPart] = oklabMatch[1].split('/');
        const parts = cols.trim().split(/\s+/);
        const L = parts[0].endsWith('%') ? parseFloat(parts[0]) / 100 : parseFloat(parts[0]);
        return oklabToRgba(L, parseFloat(parts[1]), parseFloat(parts[2]), aPart ? parseFloat(aPart) : 1);
      }
      const srgbMatch = s.match(/^color\(\s*srgb\s+([^)]+)\s*\)$/i);
      if (srgbMatch) {
        const [cols, aPart] = srgbMatch[1].split('/');
        const parts = cols.trim().split(/\s+/);
        return {
          r: Math.round(clamp01(parseFloat(parts[0])) * 255),
          g: Math.round(clamp01(parseFloat(parts[1])) * 255),
          b: Math.round(clamp01(parseFloat(parts[2])) * 255),
          a: aPart ? parseFloat(aPart) : 1,
        };
      }
      return null;
    };

    const rgba = parseOne(val);
    if (!rgba) return { raw: val, rgba: null, hue: null, delta: 0, isBlue: false, isPink: false };
    const { r, g, b, a } = rgba;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;
    let hue = 0;
    if (delta > 0) {
      const rn = r / 255;
      const gn = g / 255;
      const bn = b / 255;
      const d = (max - min) / 255;
      const mx = max / 255;
      if (mx === rn) hue = ((gn - bn) / d) % 6;
      else if (mx === gn) hue = (bn - rn) / d + 2;
      else hue = (rn - gn) / d + 4;
      hue *= 60;
      if (hue < 0) hue += 360;
    }
    const isBlue = a > 0.01 && delta >= 14 && hue >= 180 && hue <= 250 && b > r && b >= g - 2;
    const isPink = a > 0.01 && delta >= 14 && (hue >= 300 || hue <= 10) && r > g && b >= g;
    return { raw: val, rgba, hue, delta, isBlue, isPink };
  }, cssProp);
}
