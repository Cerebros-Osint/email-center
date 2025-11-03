import sanitizeHtml from 'sanitize-html';

/**
 * Sanitize HTML for safe display (inbox, preview)
 */
export function sanitizeEmailHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      'p', 'br', 'strong', 'em', 'u', 's', 'a', 'ul', 'ol', 'li',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'blockquote', 'pre', 'code',
      'table', 'thead', 'tbody', 'tr', 'td', 'th',
      'img', 'div', 'span',
    ],
    allowedAttributes: {
      'a': ['href', 'title', 'target'],
      'img': ['src', 'alt', 'title', 'width', 'height'],
      'div': ['class', 'style'],
      'span': ['class', 'style'],
      'p': ['class', 'style'],
      'td': ['colspan', 'rowspan', 'style'],
      'th': ['colspan', 'rowspan', 'style'],
    },
    allowedStyles: {
      '*': {
        'color': [/^#[0-9a-f]{3,6}$/i, /^rgb\(/],
        'background-color': [/^#[0-9a-f]{3,6}$/i, /^rgb\(/],
        'font-size': [/^\d+(?:px|em|%)$/],
        'font-weight': [/^(?:normal|bold|\d{3})$/],
        'text-align': [/^(?:left|right|center|justify)$/],
        'padding': [/^\d+(?:px|em|%)$/],
        'margin': [/^\d+(?:px|em|%)$/],
      },
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedSchemesByTag: {
      'img': ['http', 'https', 'data'],
    },
    transformTags: {
      'a': (_tagName, attribs) => {
        return {
          tagName: 'a',
          attribs: {
            ...attribs,
            target: '_blank',
            rel: 'noopener noreferrer',
          },
        };
      },
    },
  });
}

/**
 * Strip all HTML tags to get plain text
 */
export function htmlToText(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [],
    allowedAttributes: {},
  });
}

/**
 * Sanitize HTML for email composition (less strict)
 */
export function sanitizeComposerHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'h1', 'h2']),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      'img': ['src', 'alt', 'title', 'width', 'height'],
      '*': ['class', 'style'],
    },
  });
}
