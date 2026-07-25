// Utility to sanitize model-generated SVG strings against script injection and XSS
export function sanitizeSvg(svgCode: string): string {
  if (!svgCode) return '';

  return svgCode
    // Remove script tags and content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove on* event handlers (e.g. onclick, onload)
    .replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    // Remove javascript: URLs
    .replace(/href\s*=\s*(?:"javascript:[^"]*"|'javascript:[^']*')/gi, 'href="#"');
}
